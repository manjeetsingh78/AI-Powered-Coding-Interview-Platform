data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_iam_policy_document" "jenkins_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "jenkins_deploy" {
  statement {
    actions = [
      "ec2:*",
      "eks:*",
      "ecr:*",
      "autoscaling:*",
      "elasticloadbalancing:*",
      "rds:*",
      "elasticache:*",
      "s3:*",
      "dynamodb:*",
      "kms:*",
      "secretsmanager:*",
      "logs:*",
      "cloudwatch:*",
      "waf:*",
      "guardduty:*",
      "route53:*",
      "ssm:*"
    ]

    resources = ["*"]
  }

  statement {
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:CreateInstanceProfile",
      "iam:DeleteInstanceProfile",
      "iam:AddRoleToInstanceProfile",
      "iam:RemoveRoleFromInstanceProfile",
      "iam:PassRole",
      "iam:GetRole",
      "iam:List*",
      "iam:Tag*",
      "iam:Untag*"
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "jenkins" {
  name               = "${var.cluster_name}-jenkins-role"
  assume_role_policy = data.aws_iam_policy_document.jenkins_assume_role.json
  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_iam_role_policy" "jenkins_deploy" {
  name   = "${var.cluster_name}-jenkins-deploy"
  role   = aws_iam_role.jenkins.id
  policy = data.aws_iam_policy_document.jenkins_deploy.json
}

resource "aws_iam_role_policy_attachment" "jenkins_ssm" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy_attachment" "jenkins_cloudwatch" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.cluster_name}-jenkins-profile"
  role = aws_iam_role.jenkins.name
}

resource "aws_security_group" "jenkins" {
  name        = "${var.cluster_name}-jenkins-sg"
  description = "Security group for Jenkins controller"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Jenkins HTTP"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = var.jenkins_allowed_cidr_blocks
  }

  ingress {
    description = "Jenkins inbound agent port"
    from_port   = 50000
    to_port     = 50000
    protocol    = "tcp"
    cidr_blocks = var.jenkins_allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_instance" "jenkins" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.jenkins_instance_type
  subnet_id                   = module.vpc.public_subnets[0]
  vpc_security_group_ids      = [aws_security_group.jenkins.id]
  iam_instance_profile        = aws_iam_instance_profile.jenkins.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.jenkins_root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    dnf update -y
    dnf install -y awscli git jq unzip docker java-21-amazon-corretto-headless nodejs npm

    systemctl enable --now docker
    usermod -aG docker ec2-user || true

    rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    cat >/etc/yum.repos.d/jenkins.repo <<'REPO'
    [jenkins]
    name=Jenkins
    baseurl=https://pkg.jenkins.io/redhat-stable/
    gpgcheck=0
    repo_gpgcheck=0
    REPO

    dnf install -y jenkins
    alternatives --set java /usr/lib/jvm/java-21-amazon-corretto.x86_64/bin/java || true
    usermod -aG docker jenkins || true

    curl -fsSL https://releases.hashicorp.com/terraform/${var.terraform_version}/terraform_${var.terraform_version}_linux_amd64.zip -o /tmp/terraform.zip
    unzip -o /tmp/terraform.zip -d /usr/local/bin

    curl -fsSL https://dl.k8s.io/release/${var.kubectl_version}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl
    chmod +x /usr/local/bin/kubectl

    curl -fsSL https://get.helm.sh/helm-${var.helm_version}-linux-amd64.tar.gz -o /tmp/helm.tgz
    tar -xzf /tmp/helm.tgz -C /tmp
    mv /tmp/linux-amd64/helm /usr/local/bin/helm
    chmod +x /usr/local/bin/helm

    curl -fsSL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

    systemctl enable jenkins
    systemctl restart docker
    systemctl restart jenkins
  EOF

  tags = {
    Name      = "${var.cluster_name}-jenkins"
    ManagedBy = "terraform"
  }

  depends_on = [aws_iam_role_policy.jenkins_deploy]
}

resource "aws_eip" "jenkins" {
  domain = "vpc"
  tags = {
    Name      = "${var.cluster_name}-jenkins-eip"
    ManagedBy = "terraform"
  }
}

resource "aws_eip_association" "jenkins" {
  instance_id   = aws_instance.jenkins.id
  allocation_id = aws_eip.jenkins.id
}

resource "aws_eks_access_entry" "jenkins" {
  cluster_name  = var.cluster_name
  principal_arn = aws_iam_role.jenkins.arn
  type          = "STANDARD"

  depends_on = [module.eks]
}

resource "time_sleep" "jenkins_access_entry_propagation" {
  create_duration = "30s"

  depends_on = [aws_eks_access_entry.jenkins]
}

resource "aws_eks_access_policy_association" "jenkins_admin" {
  cluster_name  = var.cluster_name
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  principal_arn = aws_iam_role.jenkins.arn

  access_scope {
    type = "cluster"
  }

  depends_on = [time_sleep.jenkins_access_entry_propagation]
}
