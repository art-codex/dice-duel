/* eslint-disable no-unused-vars */
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

export default function InviteFriend() {
  const socket = useSocket();
  const { user } = useAuth();
  const [friendUsername, setFriendUsername] = useState('');
  const [bet, setBet] = useState(10);

  const sendInvite = () => {
    if (!friendUsername) return;
    // باید ابتدا userId را از username پیدا کنید – برای سادگی فعلاً فرض کنید دوستان را قبلاً دارید
    // eslint-disable-next-line no-undef
    socket.emit('invite:send', { targetUserId: friendId, bet });
  };

  // همچنین باید رویداد invite:received را بشنوید و مودال نمایش دهید.
}