import json
from channels.generic.websocket import AsyncWebsocketConsumer

users = {}

class InterviewConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.interview_id = self.scope['url_route']['kwargs']['interview_id']
        self.interview_group_name = 'interview_%s' % self.interview_id

        # Join room group
        await self.channel_layer.group_add(
            self.interview_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.interview_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'join_room':
            if self.interview_group_name not in users:
                users[self.interview_group_name] = []
            users[self.interview_group_name].append(self.channel_name)
            
            all_users = users[self.interview_group_name]
            await self.send(text_data=json.dumps({ 'type': 'all_users', 'users': all_users }))

        elif data['type'] == 'sending_signal':
            await self.channel_layer.group_send(
                data['userToSignal'],
                {
                    'type': 'user_joined',
                    'signal': data['signal'],
                    'callerID': data['callerID'],
                }
            )
        
        elif data['type'] == 'returning_signal':
            await self.channel_layer.group_send(
                data['callerID'],
                {
                    'type': 'receiving_returned_signal',
                    'signal': data['signal'],
                    'id': self.channel_name,
                }
            )

        elif data['type'] == 'code_change':
            await self.channel_layer.group_send(
                self.interview_group_name,
                {
                    'type': 'code_change_message',
                    'code': data['code'],
                    'sender': self.channel_name
                }
            )
        
        elif data['type'] == 'canvas_change':
            await self.channel_layer.group_send(
                self.interview_group_name,
                {
                    'type': 'canvas_change_message',
                    'data': data['data'],
                    'sender': self.channel_name
                }
            )

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({ 'type': 'user_joined', 'signal': event['signal'], 'callerID': event['callerID'] }))

    async def receiving_returned_signal(self, event):
        await self.send(text_data=json.dumps({ 'type': 'receiving_returned_signal', 'signal': event['signal'], 'id': event['id'] }))

    async def code_change_message(self, event):
        if self.channel_name != event['sender']:
            await self.send(text_data=json.dumps({ 'type': 'code_change', 'code': event['code'] }))

    async def canvas_change_message(self, event):
        if self.channel_name != event['sender']:
            await self.send(text_data=json.dumps({ 'type': 'canvas_change', 'data': event['data'] }))

