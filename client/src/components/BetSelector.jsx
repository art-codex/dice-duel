export default function BetSelector({ selected, onSelect, options }) {
  return (
    <div className="flex gap-2 justify-center">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            selected === opt ? 'bg-yellow-500 text-black' : 'bg-gray-700'
          }`}
        >
          {opt} 🪙
        </button>
      ))}
    </div>
  );
}