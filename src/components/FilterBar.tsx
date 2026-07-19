import { RouteTag } from '@/types/railway';
import { Zap, IndianRupee, Clock, Train, Repeat } from 'lucide-react';

interface FilterBarProps {
  activeFilter: RouteTag | 'all';
  onFilterChange: (filter: RouteTag | 'all') => void;
}

export default function FilterBar({ activeFilter, onFilterChange }: FilterBarProps) {
  const filters: { id: RouteTag | 'all', label: string, icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Trains', icon: <Train className="w-4 h-4" /> },
    { id: 'best-availability', label: 'Best Available', icon: <Zap className="w-4 h-4" /> },
    { id: 'cheapest', label: 'Cheapest', icon: <IndianRupee className="w-4 h-4" /> },
    { id: 'fastest', label: 'Fastest', icon: <Clock className="w-4 h-4" /> },
    { id: 'direct', label: 'Direct Only', icon: <Train className="w-4 h-4" /> },
    { id: 'connecting', label: 'Connecting', icon: <Repeat className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2">
      <div className="flex gap-2 min-w-max px-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
