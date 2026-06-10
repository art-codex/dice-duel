export default function RoomCard({ room, onJoin }) {
  return (
    <div className="bg-gray-800 p-3 rounded-xl flex justify-between items-center">
      <span>اتاق شرط {room.bet} سکه</span>
      <button onClick={onJoin} className="bg-green-600 px-3 py-1 rounded hover:bg-green-500">
        ورود
      </button>
    </div>
  );
}