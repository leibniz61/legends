import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="search"
        placeholder="Search threads and posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-9 px-3 rounded-md border bg-background text-sm"
      />
    </form>
  );
}
