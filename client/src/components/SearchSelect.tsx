import { useState, useEffect, useRef } from 'react';

interface Option {
  id: string;
  name: string;
  code?: string;
  [key: string]: any;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string, option?: Option) => void;
  onSearch: (keyword: string) => Promise<Option[]>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  displayName?: string;  // 👈 新增：用于显示已选中的名称
}

export default function SearchSelect({
  value,
  onChange,
  onSearch,
  placeholder = '请选择',
  className = '',
  disabled = false,
  required = false,
  displayName = '',  // 👈 新增
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(displayName);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<NodeJS.Timeout>();

  // 当外部传入的 displayName 变化时更新
  useEffect(() => {
    if (displayName) {
      setSelectedLabel(displayName);
    } else if (!value) {
      setSelectedLabel('');
    }
  }, [displayName, value]);

  const loadOptions = async (keyword: string) => {
    setLoading(true);
    try {
      const results = await onSearch(keyword);
      setOptions(results);
    } catch (error) {
      console.error('搜索失败:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (isOpen) {
        loadOptions(searchKeyword);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchKeyword, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.id, option);
    setSelectedLabel(option.name);
    setSearchKeyword('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer flex justify-between items-center ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-500'
        }`}
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="输入关键词搜索..."
              className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
              autoFocus
            />
          </div>
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">加载中...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">暂无数据</div>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                  value === option.id ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                }`}
              >
                {option.name}
                {option.code && <span className="text-gray-400 text-xs ml-2">({option.code})</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}