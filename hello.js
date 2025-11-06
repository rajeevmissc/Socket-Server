import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import axios from 'axios';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
  FaComments,
  FaCircle,
  FaUsers,
  FaClock,
  FaWifi,
  FaUser,
  FaStop,
  FaPaperPlane,
  FaTimes,
  FaCog,
  FaSignal,
  FaDownload
} from 'react-icons/fa';

// Create Agora client
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

function Call() {
  const { channelName, callType } = useParams();
  const navigate = useNavigate();
  
  // Refs
  const localVideoRef = useRef(null);
  const rtmClientRef = useRef(null);
  const rtmChannelRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const callStartTimeRef = useRef(null);
  const chatEndRef = useRef(null);
  const isJoinedRef = useRef(false);
  const isJoiningRef = useRef(false); // NEW: Track join state
  const screenTrackRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // State management
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayPos, setOverlayPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [networkQuality, setNetworkQuality] = useState({ uplink: 0, downlink: 0 });
  const [callStats, setCallStats] = useState({});
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedDevices, setSelectedDevices] = useState({ camera: '', microphone: '' });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Network quality monitoring
  useEffect(() => {
    const handleNetworkQuality = (quality) => {
      setNetworkQuality({
        uplink: quality.uplinkNetworkQuality,
        downlink: quality.downlinkNetworkQuality
      });
    };

    client.on('network-quality', handleNetworkQuality);

    return () => {
      client.off('network-quality', handleNetworkQuality);
    };
  }, []);

  // Call statistics
  useEffect(() => {
    const updateStats = async () => {
      if (isJoinedRef.current) {
        try {
          const stats = {
            localAudio: client.getLocalAudioStats(),
            localVideo: client.getLocalVideoStats(),
            remoteAudio: client.getRemoteAudioStats(),
            remoteVideo: client.getRemoteVideoStats(),
            transport: client.getTransportStats()
          };
          setCallStats(stats);
        } catch (error) {
          console.warn('Error getting call stats:', error);
        }
      }
    };

    const statsInterval = setInterval(updateStats, 5000);
    return () => clearInterval(statsInterval);
  }, []);

  // Get available devices
  const getDevices = useCallback(async () => {
    try {
      const allDevices = await AgoraRTC.getDevices();
      const cameras = allDevices.filter(device => device.kind === 'videoinput');
      const microphones = allDevices.filter(device => device.kind === 'audioinput');
      
      setDevices({ cameras, microphones });
      if (cameras.length > 0 && !selectedDevices.camera) {
        setSelectedDevices(prev => ({ ...prev, camera: cameras[0].deviceId }));
      }
      if (microphones.length > 0 && !selectedDevices.microphone) {
        setSelectedDevices(prev => ({ ...prev, microphone: microphones[0].deviceId }));
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, [selectedDevices]);

  // Switch camera device
  const switchCamera = async (deviceId) => {
    if (localTracks[1] && !isScreenSharing) {
      try {
        await localTracks[1].setDevice(deviceId);
        setSelectedDevices(prev => ({ ...prev, camera: deviceId }));
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  // Switch microphone device
  const switchMicrophone = async (deviceId) => {
    if (localTracks[0]) {
      try {
        await localTracks[0].setDevice(deviceId);
        setSelectedDevices(prev => ({ ...prev, microphone: deviceId }));
      } catch (error) {
        console.error('Error switching microphone:', error);
      }
    }
  };

  // Dragging functionality for overlay
  const handleOverlayMouseDown = (e) => {
    setDragging(true);
    const overlay = e.currentTarget;
    const rect = overlay.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => {
      setOverlayPos({ 
        x: e.clientX - dragOffset.current.x, 
        y: e.clientY - dragOffset.current.y 
      });
    };
    
    const handleMouseUp = () => setDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // Play local video when tracks are ready
  useEffect(() => {
    if (callType === 'video' && localTracks[1] && localVideoRef.current && !isVideoOff && !isScreenSharing) {
      try {
        localTracks[1].play(localVideoRef.current);
      } catch (err) {
        console.error('Error playing local video:', err);
      }
    }
  }, [localTracks, isVideoOff, callType, isScreenSharing]);

  // Call duration timer
  useEffect(() => {
    callStartTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'm':
          toggleAudio();
          break;
        case 'v':
          if (callType === 'video') toggleVideo();
          break;
        case 'c':
          setShowChat(prev => !prev);
          break;
        case 'p':
          setShowParticipants(prev => !prev);
          break;
        case 'escape':
          if (showChat) setShowChat(false);
          if (showParticipants) setShowParticipants(false);
          if (showSettings) setShowSettings(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showChat, showParticipants, showSettings, callType]);

  // Main effect - Join channel
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login/user');
      return;
    }

    // Prevent multiple joins
    if (isJoiningRef.current || isJoinedRef.current) {
      console.log('Already joining/joined, skipping...');
      return;
    }

    let tracksToCleanUp = [];

    const joinChannel = async () => {
      try {
        isJoiningRef.current = true;
        setIsLoading(true);
        setError(null);

        // Setup RTC event listeners
        client.on('user-published', async (user, mediaType) => {
          console.log('User published:', user.uid, mediaType);
          try {
            await client.subscribe(user, mediaType);
            
            if (mediaType === 'video') {
              setRemoteUsers(prev => {
                const userExists = prev.some(u => u.uid === user.uid);
                if (!userExists) {
                  return [...prev, user];
                }
                return prev.map(u => u.uid === user.uid ? user : u);
              });
            }
            
            if (mediaType === 'audio' && user.audioTrack) {
              user.audioTrack.play();
            }
          } catch (err) {
            console.error('Subscribe error:', err);
          }
        });

        client.on('user-unpublished', (user, mediaType) => {
          console.log('User unpublished:', user.uid, mediaType);
          if (mediaType === 'video') {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          }
        });

        client.on('user-joined', (user) => {
          console.log('User joined:', user.uid);
        });

        client.on('user-left', (user) => {
          console.log('User left:', user.uid);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        // Token expiration handling
        client.on('token-privilege-will-expire', async () => {
          console.log('Token will expire, refreshing...');
          try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/agora/call-tokens`, {
              headers: { Authorization: `Bearer ${token}` },
              params: { channel: channelName }
            });
            await client.renewToken(response.data.rtcToken);
          } catch (error) {
            console.error('Token refresh failed:', error);
          }
        });

        client.on('token-privilege-did-expire', () => {
          setError('Token expired. Please reconnect.');
        });

        // Connection state monitoring
        client.on('connection-state-change', (curState, prevState) => {
          console.log('Connection state changed:', prevState, '->', curState);
          
          if (curState === 'DISCONNECTED' && prevState === 'CONNECTED') {
            setIsReconnecting(true);
          } else if (curState === 'CONNECTED') {
            setIsReconnecting(false);
          }
        });

        // Get tokens from backend
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/agora/call-tokens`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { channel: channelName }
        });

        const { rtcToken, rtmToken, uid: serverUid, appId } = response.data;
        console.log('Tokens received, joining channel...');

        // Get available devices
        await getDevices();

        // Check connection state before joining
        const connectionState = client.connectionState;
        if (connectionState !== 'DISCONNECTED') {
          console.log('Client not in DISCONNECTED state, current state:', connectionState);
          // If already connected, just setup local tracks
          if (connectionState === 'CONNECTED') {
            isJoinedRef.current = true;
            await setupLocalTracks(serverUid);
            return;
          }
        }

        // Join RTC channel
        await client.join(appId, channelName, rtcToken, serverUid);
        console.log('RTC channel joined successfully');
        isJoinedRef.current = true;

        // Setup local tracks
        await setupLocalTracks(serverUid);

        // RTM Chat Setup
        await setupRTM(appId, serverUid, rtmToken, channelName);

        setIsLoading(false);
        isJoiningRef.current = false;

      } catch (error) {
        console.error('Failed to join channel', error);
        setError(`Failed to join call: ${error.message}`);
        setIsLoading(false);
        isJoiningRef.current = false;
        isJoinedRef.current = false;
      }
    };

    // Setup local tracks function
    const setupLocalTracks = async (serverUid) => {
      let tracks;
      try {
        if (callType === 'audio') {
          tracks = [await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: selectedDevices.microphone }), null];
        } else {
          tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
            { microphoneId: selectedDevices.microphone },
            { cameraId: selectedDevices.camera, encoderConfig: '720p_2' }
          );
        }
      } catch (trackError) {
        console.error('Track creation failed:', trackError);
        if (callType === 'video') {
          // Fallback to audio only
          tracks = [await AgoraRTC.createMicrophoneAudioTrack(), null];
          setIsVideoOff(true);
        } else {
          throw trackError;
        }
      }
      
      tracksToCleanUp = tracks.filter(track => track !== null);
      setLocalTracks(tracks);

      // Publish tracks based on call type
      const tracksToPublish = tracks.filter(track => track !== null);
      await client.publish(tracksToPublish);
      
      if (callType === 'video' && tracks[1] && localVideoRef.current) {
        tracks[1].play(localVideoRef.current);
      }
      
      console.log('Local tracks published');
    };

    // Setup RTM function
    const setupRTM = async (appId, serverUid, rtmToken, channelName) => {
      try {
        rtmClientRef.current = AgoraRTM.createInstance(appId);
        await rtmClientRef.current.login({ 
          uid: serverUid.toString(), 
          token: rtmToken
        });
        
        rtmChannelRef.current = await rtmClientRef.current.createChannel(channelName);
        await rtmChannelRef.current.join();
        console.log('RTM channel joined successfully');

        // RTM message handler
        rtmChannelRef.current.on('ChannelMessage', (message, memberId) => {
          console.log('Message received:', message, memberId);
          let parsed;
          try {
            parsed = JSON.parse(message.text);
          } catch {
            parsed = { text: message.text };
          }
          const newMsg = {
            id: Date.now() + Math.random(),
            text: parsed.text,
            timestamp: new Date().toLocaleTimeString(),
            sender: memberId === serverUid.toString() ? 'You' : `User ${memberId}`
          };
          setChatMessages(prev => [...prev, newMsg]);
        });

      } catch (rtmError) {
        console.warn('RTM setup failed, chat will not be available:', rtmError);
      }
    };

    joinChannel();

    return () => {
      console.log('Cleaning up...');
      isJoiningRef.current = false;
      
      // Cleanup local tracks
      tracksToCleanUp.forEach(track => {
        try {
          track.stop();
          track.close();
        } catch (err) {
          console.error('Error closing track:', err);
        }
      });

      // Cleanup screen track
      if (screenTrackRef.current) {
        screenTrackRef.current.close();
      }
      
      // Cleanup RTC - only leave if we actually joined
      if (isJoinedRef.current) {
        client.removeAllListeners();
        client.leave().catch(err => console.error('Error leaving channel:', err));
        isJoinedRef.current = false;
      }
      
      // Cleanup RTM
      const cleanupRTM = async () => {
        try {
          if (rtmChannelRef.current) {
            await rtmChannelRef.current.leave();
          }
          if (rtmClientRef.current) {
            await rtmClientRef.current.logout();
          }
        } catch (err) {
          console.warn('RTM cleanup error:', err);
        }
      };
      cleanupRTM();
      
      // Stop recording if active
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [channelName, callType, navigate, getDevices, selectedDevices]);

  // Toggle audio
  const toggleAudio = async () => {
    if (localTracks[0]) {
      try {
        const newMuted = !isAudioMuted;
        await localTracks[0].setEnabled(!newMuted);
        setIsAudioMuted(newMuted);
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (callType === 'audio') {
      alert('Video is not available in audio-only mode');
      return;
    }
    if (localTracks[1] && !isScreenSharing) {
      try {
        const newVideoOff = !isVideoOff;
        await localTracks[1].setEnabled(!newVideoOff);
        setIsVideoOff(newVideoOff);
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    }
  };

  // Screen sharing
  const startScreenShare = async () => {
    if (callType === 'audio') {
      alert('Screen sharing is only available in video mode');
      return;
    }
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1'
      });
      
      await client.unpublish([localTracks[1]]);
      await client.publish([screenTrack]);
      screenTrackRef.current = screenTrack;
      setIsScreenSharing(true);
      
      screenTrack.on('track-ended', async () => {
        await stopScreenShare();
      });
    } catch (error) {
      console.error('Screen sharing failed:', error);
      if (error.message.includes('Permission denied')) {
        alert('Screen sharing permission denied. Please allow screen sharing in your browser.');
      } else {
        alert('Failed to start screen sharing');
      }
    }
  };

  const stopScreenShare = async () => {
    if (isScreenSharing && screenTrackRef.current) {
      try {
        await client.unpublish([screenTrackRef.current]);
        await client.publish([localTracks[1]]);
        screenTrackRef.current.close();
        screenTrackRef.current = null;
        setIsScreenSharing(false);
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    }
  };

  // Recording
  const startRecording = async () => {
    try {
      const stream = new MediaStream();
      
      // Add local tracks
      if (localTracks[0]) stream.addTrack(localTracks[0].getMediaStreamTrack());
      if (localTracks[1] && callType === 'video' && !isVideoOff) {
        stream.addTrack(localTracks[1].getMediaStreamTrack());
      }
      
      // Add screen share if active
      if (isScreenSharing && screenTrackRef.current) {
        stream.addTrack(screenTrackRef.current.getMediaStreamTrack());
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-${channelName}-${new Date().toISOString().split('T')[0]}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording failed:', error);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (chatInput.trim()) {
      const messageText = chatInput.trim();
      setChatInput('');
      
      const newMsg = {
        id: Date.now(),
        text: messageText,
        timestamp: new Date().toLocaleTimeString(),
        sender: 'You'
      };
      
      setChatMessages(prev => [...prev, newMsg]);
      
      if (rtmChannelRef.current) {
        try {
          await rtmChannelRef.current.sendMessage({ 
            text: JSON.stringify({ text: messageText }) 
          });
        } catch (err) {
          console.warn('[RTM] Failed to send message', err);
        }
      }
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // End call
  const endCall = () => {
    if (isRecording) stopRecording();
    if (isScreenSharing) stopScreenShare();
    navigate('/appointment');
  };

  // Get network quality color
  const getNetworkQualityColor = (quality) => {
    return quality === 1 ? 'text-green-500' : 
           quality === 2 ? 'text-green-400' :
           quality === 3 ? 'text-yellow-500' :
           quality === 4 ? 'text-red-400' : 'text-red-500';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Joining call...</p>
          <p className="text-gray-400 text-sm mt-2">Channel: {channelName}</p>
          {isReconnecting && (
            <p className="text-yellow-500 text-sm mt-2">Reconnecting...</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimes className="text-white text-2xl" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/appointment')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Main call UI (same as before)
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className={`${showChat ? 'w-3/4' : 'w-full'} flex flex-col transition-all duration-300 ease-in-out`}>
             {/* Header */}
             <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 shadow-lg">
               <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-2">
                     <FaWifi className={getNetworkQualityColor(networkQuality.uplink)} />
                     <div>
                       <h1 className="text-xl font-semibold text-white">
                         {callType === 'video' ? 'Video Conference' : 'Audio Conference'}
                       </h1>
                       <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                         <span className="flex items-center space-x-1">
                           <FaClock />
                           <span>{formatDuration(callDuration)}</span>
                         </span>
                         <span className="text-gray-500">•</span>
                         <span>Channel: {channelName}</span>
                         <span className="text-gray-500">•</span>
                         <span>{remoteUsers.length} participant{remoteUsers.length !== 1 ? 's' : ''}</span>
                         {isReconnecting && (
                           <span className="text-yellow-500 animate-pulse">Reconnecting...</span>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex items-center space-x-3">
                   <div className="flex items-center space-x-2 text-sm">
                     <span className="text-gray-400">Upload:</span>
                     <FaSignal className={getNetworkQualityColor(networkQuality.uplink)} />
                     <span className="text-gray-400">Download:</span>
                     <FaSignal className={getNetworkQualityColor(networkQuality.downlink)} />
                   </div>
                   
                   <button
                     onClick={() => setShowParticipants(!showParticipants)}
                     className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                   >
                     <FaUsers />
                     <span className="text-sm font-medium">{remoteUsers.length + 1}</span>
                   </button>
                   
                   <button
                     onClick={() => setShowSettings(!showSettings)}
                     className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                   >
                     <FaCog />
                   </button>
                   
                   {isRecording && (
                     <div className="flex items-center space-x-2 bg-red-600 px-3 py-2 rounded-lg shadow-lg">
                       <FaCircle className="w-2 h-2 animate-pulse" />
                       <span className="text-sm font-medium">Recording</span>
                     </div>
                   )}
                   
                   <div className="flex items-center space-x-2 bg-green-600 px-3 py-2 rounded-lg">
                     <div className="w-2 h-2 bg-white rounded-full"></div>
                     <span className="text-sm">Live</span>
                   </div>
                 </div>
               </div>
             </div>
     
             {/* Video Area */}
             <div className="flex-1 bg-gray-900 p-6 relative">
               {remoteUsers.length > 0 ? (
                 <>
                   <div className="absolute inset-0 flex items-center justify-center z-0">
                     <RemoteUser user={remoteUsers[0]} callType={callType} isFullscreen />
                   </div>
                   <div
                     className="absolute z-10 w-56 h-40 bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col cursor-move"
                     style={{
                       left: overlayPos.x !== null ? overlayPos.x : 'auto',
                       top: overlayPos.y !== null ? overlayPos.y : 'auto',
                       right: overlayPos.x === null ? '2rem' : 'auto',
                       bottom: overlayPos.y === null ? '2rem' : 'auto',
                     }}
                     onMouseDown={handleOverlayMouseDown}
                   >
                     <div className="absolute top-2 left-2 z-10">
                       <div className="bg-black bg-opacity-70 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-600">
                         <div className="flex items-center space-x-1">
                           <FaUser className="text-blue-400" />
                           <span className="text-xs font-medium">You</span>
                           {isAudioMuted && <FaMicrophoneSlash className="text-red-400 text-xs" />}
                           {(isVideoOff || isScreenSharing) && <FaVideoSlash className="text-yellow-400 text-xs" />}
                           {isScreenSharing && <FaDesktop className="text-green-400 text-xs" />}
                         </div>
                       </div>
                     </div>
                     <div
                       ref={localVideoRef}
                       className="w-full h-full bg-slate-900 flex items-center justify-center relative"
                     >
                       {(isVideoOff || callType === 'audio' || isScreenSharing) && (
                         <div className="flex flex-col items-center space-y-2">
                           <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                             <FaUser className="text-white text-lg" />
                           </div>
                           <div className="text-center">
                             <p className="text-xs text-gray-400">
                               {isScreenSharing ? 'Screen Sharing' : callType === 'audio' ? 'Audio Only' : 'Camera Off'}
                             </p>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 </>
               ) : (
                 <div className="flex justify-center items-center h-full">
                   <div className="relative group">
                     <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                       <div className="absolute top-4 left-4 z-10">
                         <div className="bg-black bg-opacity-70 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-600">
                           <div className="flex items-center space-x-2">
                             <FaUser className="text-blue-400" />
                             <span className="text-xs font-medium">You</span>
                             {isAudioMuted && <FaMicrophoneSlash className="text-red-400 text-xs" />}
                             {(isVideoOff || isScreenSharing) && <FaVideoSlash className="text-yellow-400 text-xs" />}
                             {isScreenSharing && <FaDesktop className="text-green-400 text-xs" />}
                           </div>
                         </div>
                       </div>
                       <div
                         ref={localVideoRef}
                         className="w-96 h-72 bg-slate-900 flex items-center justify-center relative"
                       >
                         {(isVideoOff || callType === 'audio' || isScreenSharing) && (
                           <div className="flex flex-col items-center space-y-4">
                             <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                               <FaUser className="text-white text-2xl" />
                             </div>
                             <div className="text-center">
                               <p className="text-sm text-gray-400">
                                 {isScreenSharing ? 'Sharing Screen' : callType === 'audio' ? 'Audio Only Mode' : 'Camera is off'}
                               </p>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               )}
               {remoteUsers.length === 0 && (
                 <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl max-w-md">
                   <div className="flex justify-center mb-4">
                     <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                       <FaUsers className="text-white text-2xl" />
                     </div>
                   </div>
                   <h3 className="text-xl font-semibold mb-2 text-white">Waiting for participants</h3>
                   <p className="text-gray-400 text-sm mb-4">The other party will join shortly</p>
                   <div className="bg-slate-700 px-4 py-2 rounded-lg inline-block">
                     <code className="text-blue-400 font-mono text-sm">{channelName}</code>
                   </div>
                 </div>
               )}
             </div>
     
             {/* Controls */}
             <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
               <div className="flex items-center justify-center space-x-3">
                 <ControlButton
                   onClick={toggleAudio}
                   active={!isAudioMuted}
                   icon={isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                   label="Microphone"
                   className={`${isAudioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'} shadow-lg`}
                 />
                 
                 {callType === 'video' && (
                   <ControlButton
                     onClick={toggleVideo}
                     active={!isVideoOff}
                     icon={isVideoOff ? <FaVideoSlash /> : <FaVideo />}
                     label="Camera"
                     className={`${isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'} shadow-lg`}
                   />
                 )}
     
                 {callType === 'video' && (
                   <ControlButton
                     onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                     active={isScreenSharing}
                     icon={<FaDesktop />}
                     label="Share"
                     className={`${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'} shadow-lg`}
                   />
                 )}
     
                 <ControlButton
                   onClick={isRecording ? stopRecording : startRecording}
                   active={isRecording}
                   icon={isRecording ? <FaStop /> : <FaCircle />}
                   label={isRecording ? 'Stop' : 'Record'}
                   className={`${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'} shadow-lg`}
                 />
     
                 <ControlButton
                   onClick={() => setShowChat(!showChat)}
                   active={showChat}
                   icon={<FaComments />}
                   label="Chat"
                   className={`${showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'} shadow-lg`}
                   badge={chatMessages.length > 0 ? chatMessages.length : null}
                 />
     
                 <ControlButton
                   onClick={endCall}
                   active={false}
                   icon={<FaPhoneSlash />}
                   label="End Call"
                   className="bg-red-600 hover:bg-red-700 shadow-lg ml-4"
                 />
               </div>
             </div>
           </div>
     
           {/* Chat Panel */}
           {showChat && (
             <div className="w-1/4 bg-slate-800 border-l border-slate-700 flex flex-col shadow-2xl">
               <div className="bg-slate-700 p-4 border-b border-slate-600">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-3">
                     <FaComments className="text-blue-400" />
                     <div>
                       <h3 className="font-semibold text-white">Chat</h3>
                       <p className="text-xs text-gray-400">{remoteUsers.length + 1} participants</p>
                     </div>
                   </div>
                   <button
                     onClick={() => setShowChat(false)}
                     className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-600 transition-colors"
                   >
                     <FaTimes />
                   </button>
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
                 {chatMessages.length === 0 ? (
                   <div className="text-center text-gray-500 mt-8">
                     <FaComments className="mx-auto text-4xl mb-4 opacity-50" />
                     <p className="text-sm">No messages yet</p>
                     <p className="text-xs mt-1">Start the conversation!</p>
                   </div>
                 ) : (
                   chatMessages.map(message => (
                     <div key={message.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                       <div className="flex justify-between items-center mb-2">
                         <span className="font-medium text-blue-400 text-sm">{message.sender}</span>
                         <span className="text-xs text-gray-500">{message.timestamp}</span>
                       </div>
                       <p className="text-sm text-gray-200 break-words leading-relaxed">{message.text}</p>
                     </div>
                   ))
                 )}
                 <div ref={chatEndRef} />
               </div>
               
               <div className="p-4 border-t border-slate-700 bg-slate-800">
                 <div className="flex space-x-2">
                   <input
                     type="text"
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                     placeholder="Type your message..."
                     className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                   <button
                     onClick={sendMessage}
                     disabled={!chatInput.trim()}
                     className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 border-none rounded-xl px-4 py-2 text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                   >
                     <FaPaperPlane className="text-sm" />
                   </button>
                 </div>
               </div>
             </div>
           )}
     
           {/* Participants Panel */}
           {showParticipants && (
             <div className="absolute top-20 right-6 bg-slate-800 border border-slate-700 rounded-2xl p-6 min-w-80 z-50 shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="text-lg font-semibold flex items-center space-x-2">
                   <FaUsers className="text-blue-400" />
                   <span>Participants ({remoteUsers.length + 1})</span>
                 </h4>
                 <button
                   onClick={() => setShowParticipants(false)}
                   className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                 >
                   <FaTimes />
                 </button>
               </div>
               <div className="space-y-3 max-h-64 overflow-y-auto">
                 <div className="flex items-center space-x-3 p-3 bg-slate-700 rounded-xl border border-slate-600">
                   <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                     <FaUser className="text-white" />
                   </div>
                   <div className="flex-1">
                     <p className="font-medium text-white">You (Host)</p>
                     <div className="flex items-center space-x-2 text-xs text-gray-400">
                       {isAudioMuted ? (
                         <span className="flex items-center space-x-1 text-red-400">
                           <FaMicrophoneSlash />
                           <span>Muted</span>
                         </span>
                       ) : (
                         <span className="flex items-center space-x-1 text-green-400">
                           <FaMicrophone />
                           <span>Speaking</span>
                         </span>
                       )}
                       <span>•</span>
                       {isVideoOff || callType === 'audio' ? (
                         <span className="flex items-center space-x-1 text-yellow-400">
                           <FaVideoSlash />
                           <span>Camera Off</span>
                         </span>
                       ) : (
                         <span className="flex items-center space-x-1 text-green-400">
                           <FaVideo />
                           <span>Camera On</span>
                         </span>
                       )}
                       {isScreenSharing && (
                         <>
                           <span>•</span>
                           <span className="flex items-center space-x-1 text-blue-400">
                             <FaDesktop />
                             <span>Sharing</span>
                           </span>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
                 {remoteUsers.map(user => (
                   <div key={user.uid} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-xl border border-slate-600">
                     <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                       <FaUser className="text-white" />
                     </div>
                     <div className="flex-1">
                       <p className="font-medium text-white">User {user.uid}</p>
                       <div className="flex items-center space-x-1 text-xs text-green-400">
                         <FaWifi />
                         <span>Connected</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
     
           {/* Settings Panel */}
           {showSettings && (
             <div className="absolute top-20 right-6 bg-slate-800 border border-slate-700 rounded-2xl p-6 min-w-80 z-50 shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="text-lg font-semibold flex items-center space-x-2">
                   <FaCog className="text-blue-400" />
                   <span>Settings</span>
                 </h4>
                 <button
                   onClick={() => setShowSettings(false)}
                   className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                 >
                   <FaTimes />
                 </button>
               </div>
               
               <div className="space-y-4">
                 {/* Camera Settings */}
                 {callType === 'video' && (
                   <div>
                     <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
                     <select
                       value={selectedDevices.camera}
                       onChange={(e) => switchCamera(e.target.value)}
                       className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                     >
                       {devices.cameras.map(camera => (
                         <option key={camera.deviceId} value={camera.deviceId}>
                           {camera.label || `Camera ${devices.cameras.indexOf(camera) + 1}`}
                         </option>
                       ))}
                     </select>
                   </div>
                 )}
                 
                 {/* Microphone Settings */}
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">Microphone</label>
                   <select
                     value={selectedDevices.microphone}
                     onChange={(e) => switchMicrophone(e.target.value)}
                     className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     {devices.microphones.map(microphone => (
                       <option key={microphone.deviceId} value={microphone.deviceId}>
                         {microphone.label || `Microphone ${devices.microphones.indexOf(microphone) + 1}`}
                       </option>
                     ))}
                   </select>
                 </div>
                 
                 {/* Network Info */}
                 <div className="pt-4 border-t border-slate-700">
                   <h5 className="text-sm font-medium text-gray-300 mb-2">Network Quality</h5>
                   <div className="flex justify-between text-xs">
                     <span>Upload: <span className={getNetworkQualityColor(networkQuality.uplink)}>
                       {networkQuality.uplink === 1 ? 'Excellent' : 
                        networkQuality.uplink === 2 ? 'Good' : 
                        networkQuality.uplink === 3 ? 'Poor' : 
                        networkQuality.uplink === 4 ? 'Bad' : 'Unknown'}
                     </span></span>
                     <span>Download: <span className={getNetworkQualityColor(networkQuality.downlink)}>
                       {networkQuality.downlink === 1 ? 'Excellent' : 
                        networkQuality.downlink === 2 ? 'Good' : 
                        networkQuality.downlink === 3 ? 'Poor' : 
                        networkQuality.downlink === 4 ? 'Bad' : 'Unknown'}
                     </span></span>
                   </div>
                 </div>
                 
                 {/* Keyboard Shortcuts */}
                 <div className="pt-4 border-t border-slate-700">
                   <h5 className="text-sm font-medium text-gray-300 mb-2">Keyboard Shortcuts</h5>
                   <div className="text-xs text-gray-400 space-y-1">
                     <div className="flex justify-between">
                       <span>Mute/Unmute:</span>
                       <code className="bg-slate-700 px-2 py-1 rounded">M</code>
                     </div>
                     <div className="flex justify-between">
                       <span>Toggle Video:</span>
                       <code className="bg-slate-700 px-2 py-1 rounded">V</code>
                     </div>
                     <div className="flex justify-between">
                       <span>Toggle Chat:</span>
                       <code className="bg-slate-700 px-2 py-1 rounded">C</code>
                     </div>
                     <div className="flex justify-between">
                       <span>Toggle Participants:</span>
                       <code className="bg-slate-700 px-2 py-1 rounded">P</code>
                     </div>
                     <div className="flex justify-between">
                       <span>Close Panels:</span>
                       <code className="bg-slate-700 px-2 py-1 rounded">ESC</code>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}
    </div>
  );
}

// Control Button Component (same as before)
const ControlButton = ({ onClick, active, icon, label, className, badge }) => (
  <div className="relative">
    <button
      onClick={onClick}
      className={`${className} border-none rounded-xl px-4 py-3 text-white font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 flex flex-col items-center space-y-1 min-w-20 shadow-lg hover:shadow-xl`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
    {badge && (
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
        {badge > 99 ? '99+' : badge}
      </div>
    )}
  </div>
);

// Remote User Component (same as before)
const RemoteUser = ({ user, callType, isFullscreen }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (callType === 'video' && user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current);
    }
    if (user.audioTrack) {
      user.audioTrack.play();
    }
    
    return () => {
      if (user.videoTrack && videoRef.current) {
        user.videoTrack.stop();
      }
    };
  }, [user, callType]);

  return (
    <div className={isFullscreen ? 'w-full h-full flex items-center justify-center' : 'relative group'}>
      <div className={isFullscreen ? 'w-full h-full bg-slate-900 flex items-center justify-center' : 'bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700'}>
        <div className={isFullscreen ? 'absolute top-8 left-8 z-10' : 'absolute top-4 left-4 z-10'}>
          <div className="bg-black bg-opacity-70 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-600">
            <div className="flex items-center space-x-2">
              <FaUser className="text-green-400" />
              <span className="text-xs font-medium">User {user.uid}</span>
            </div>
          </div>
        </div>
        <div
          ref={videoRef}
          className={isFullscreen ? 'w-full h-full bg-slate-900 flex items-center justify-center relative' : 'w-80 h-60 bg-slate-900 flex items-center justify-center relative'}
        >
          {callType === 'audio' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <FaUser className="text-white text-2xl" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">Audio only</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Call;