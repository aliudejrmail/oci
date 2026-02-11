import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface Option {
    label: string
    value: string
    disabled?: boolean
}

interface SearchableSelectProps {
    options: Option[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    emptyMessage?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    disabled = false,
    className = '',
    emptyMessage = 'Nenhuma opção encontrada.',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                setSearch('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (optionValue: string) => {
        onChange(optionValue)
        setIsOpen(false)
        setSearch('')
    }

    const toggleOpen = () => {
        if (disabled) return
        setIsOpen(!isOpen)
        if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50)
        } else {
            setSearch('')
        }
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange('')
        setSearch('')
    }

    return (
        <div
            ref={containerRef}
            className={`relative w-full ${className}`}
        >
            <div
                onClick={toggleOpen}
                className={`w-full px-2 py-1.5 min-h-[30px] text-xs bg-white border rounded cursor-pointer flex items-center justify-between
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-gray-400'}
          ${isOpen ? 'ring-1 ring-primary-500 border-primary-500' : 'border-gray-300'}
        `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-700'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="flex items-center ml-1">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 text-gray-400 hover:text-gray-600 mr-1"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search
                                size={12}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar..."
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 max-h-48">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    disabled={opt.disabled}
                                    className={`w-full px-2 py-1.5 text-left text-xs flex items-center justify-between
                    ${opt.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                    ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                >
                                    <span className="truncate mr-2">{opt.label}</span>
                                    {opt.value === value && <Check size={12} className="shrink-0" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-2 py-3 text-center text-xs text-gray-500">
                                {emptyMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
