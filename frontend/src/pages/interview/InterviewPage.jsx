import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import MonacoEditor from 'react-monaco-editor';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import useAuth from '../../hooks/useAuth';
import Peer from 'simple-peer';

const InterviewPage = () => {
    const { interviewId } = useParams();
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [code, setCode] = useState('// Type your code here');
    const editorRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState();
    const [peers, setPeers] = useState([]);
    const userVideo = useRef();
    const peersRef = useRef([]);
    const [aiSocket, setAiSocket] = useState(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://${window.location.host}/ws/interview/${interviewId}/`);
        const aiWs = new WebSocket(`ws://${window.location.host}/ws/ai_evaluation/${interviewId}/`);

        setAiSocket(aiWs);

        Promise.all([
            navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        ]).then(([videoStream, screenStream]) => {
            setStream(videoStream);
            if (userVideo.current) {
                userVideo.current.srcObject = videoStream;
            }

            const videoRecorder = new MediaRecorder(videoStream);
            videoRecorder.ondataavailable = (e) => {
                if (aiWs.readyState === WebSocket.OPEN) {
                    aiWs.send(e.data);
                }
            };
            setMediaRecorder(videoRecorder);
            videoRecorder.start(1000); // Start recording and send data every second

            const screenRecorder = new MediaRecorder(screenStream);
            screenRecorder.ondataavailable = (e) => {
                 if (aiWs.readyState === WebSocket.OPEN) {
                    aiWs.send(e.data);
                }
            };
            setScreenRecorder(screenRecorder);
            screenRecorder.start(1000); // Start recording and send data every second

            ws.onopen = () => {
                console.log('WebSocket connected');
                setSocket(ws);
                ws.send(JSON.stringify({ type: 'join_room', room: interviewId }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'all_users') {
                    const peers = [];
                    data.users.forEach(userID => {
                        const peer = createPeer(userID, ws.id, stream);
                        peersRef.current.push({
                            peerID: userID,
                            peer,
                        })
                        peers.push(peer);
                    })
                    setPeers(peers);
                } else if (data.type === 'user_joined') {
                    const peer = addPeer(data.signal, data.callerID, stream);
                    peersRef.current.push({
                        peerID: data.callerID,
                        peer,
                    })
                    setPeers(users => [...users, peer]);
                } else if (data.type === 'receiving_returned_signal') {
                    const item = peersRef.current.find(p => p.peerID === data.id);
                    item.peer.signal(data.signal);
                } else if (data.type === 'code_change') {
                    setCode(data.code);
                } else if (data.type === 'canvas_change') {
                    try {
                        if (canvasRef.current && data.data) {
                            // data.data expected to be an array of paths exported from ReactSketchCanvas
                            canvasRef.current.loadPaths(data.data);
                        }
                    } catch (err) {
                        console.error('Failed to load canvas data', err);
                    }
                }
            };
        })

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return () => {
            ws.close();
        };
    }, [interviewId]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socket.send(JSON.stringify({ type: 'sending_signal', userToSignal, callerID, signal }))
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socket.send(JSON.stringify({ type: 'returning_signal', signal, callerID }))
        })

        peer.signal(incomingSignal);

        return peer;
    }

    const handleEditorChange = (newValue, e) => {
        setCode(newValue);
        if (socket) {
            socket.send(JSON.stringify({ type: 'code_change', code: newValue }));
        }
    };

    const handleCanvasChange = async () => {
        if (socket && canvasRef.current) {
            try {
                const paths = await canvasRef.current.exportPaths();
                socket.send(JSON.stringify({ type: 'canvas_change', data: paths }));
            } catch (err) {
                console.error('Failed to export canvas paths', err);
            }
        }
    };

    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
    }

    const startRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.start();
        }
        if (screenRecorder) {
            screenRecorder.start();
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        if (screenRecorder) {
            screenRecorder.stop();
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1, padding: '1rem' }}>
                <h2>Live Interview Session</h2>
                <p>Interview ID: {interviewId}</p>
                <p>User: {user.username}</p>
                <div>
                    <button onClick={startRecording}>Start Recording</button>
                    <button onClick={stopRecording}>Stop Recording</button>
                </div>
                <div style={{ display: 'flex' }}>
                    <video style={{ width: '150px' }} muted ref={userVideo} autoPlay playsInline />
                    {peers.map((peer, index) => {
                        const videoRef = React.createRef();
                        peer.on('stream', stream => {
                            videoRef.current.srcObject = stream;
                        });
                        return (
                            <video key={index} style={{ width: '150px' }} ref={videoRef} autoPlay playsInline />
                        );
                    })}
                </div>
                <MonacoEditor
                    height="80vh"
                    language="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => handleEditorChange(value)}
                    editorDidMount={handleEditorDidMount}
                />
                <div style={{ marginTop: 12 }}>
                    <ReactSketchCanvas
                        ref={canvasRef}
                        strokeColor="#ffffff"
                        strokeWidth={2}
                        width="500px"
                        height="500px"
                        style={{ background: 'transparent' }}
                        onChange={() => handleCanvasChange()}
                    />
                </div>
            </div>
        </div>
    );
};

export default InterviewPage;
