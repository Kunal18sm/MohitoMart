import { useEffect, useMemo, useRef, useState } from 'react';

const normalizeValue = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeValue(value).toLowerCase();

const SuggestionInput = ({
    value,
    onChange,
    options = [],
    placeholder = '',
    ariaLabel = '',
    inputId = '',
    disabled = false,
    type = 'text',
    maxLength,
    className = '',
    containerClassName = '',
    maxSuggestions = 8,
}) => {
    const containerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const uniqueOptions = useMemo(() => {
        const deduped = new Map();
        options.forEach((option) => {
            const label = normalizeValue(option);
            const key = normalizeKey(label);
            if (!label || !key || deduped.has(key)) {
                return;
            }
            deduped.set(key, label);
        });
        return [...deduped.values()];
    }, [options]);

    const filteredOptions = useMemo(() => {
        const query = normalizeKey(value);
        const matches = query
            ? uniqueOptions.filter((option) => normalizeKey(option).includes(query))
            : uniqueOptions;
        return matches.slice(0, maxSuggestions);
    }, [uniqueOptions, value, maxSuggestions]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applySuggestion = (suggestion) => {
        onChange(suggestion);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (event) => {
        if (!isOpen || filteredOptions.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((previous) =>
                previous >= filteredOptions.length - 1 ? 0 : previous + 1
            );
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((previous) =>
                previous <= 0 ? filteredOptions.length - 1 : previous - 1
            );
            return;
        }

        if (event.key === 'Enter' && highlightedIndex >= 0) {
            event.preventDefault();
            applySuggestion(filteredOptions[highlightedIndex]);
            return;
        }

        if (event.key === 'Escape') {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    return (
        <div ref={containerRef} className={`relative ${containerClassName}`}>
            <input
                id={inputId}
                type={type}
                value={value}
                disabled={disabled}
                maxLength={maxLength}
                autoComplete="off"
                aria-label={ariaLabel || placeholder || 'Suggestion input'}
                placeholder={placeholder}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                onChange={(event) => {
                    onChange(event.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(-1);
                }}
                className={className}
            />

            {isOpen && filteredOptions.length > 0 && !disabled && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <ul className="max-h-44 overflow-y-auto py-1">
                        {filteredOptions.map((option, index) => (
                            <li key={`${option}-${index}`}>
                                <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => applySuggestion(option)}
                                    className={`w-full px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-primary/10 ${highlightedIndex === index ? 'bg-primary/10' : ''
                                        }`}
                                >
                                    {option}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SuggestionInput;
