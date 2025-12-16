import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface SmartFieldInputProps {
  field: EntityField | null
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function SmartFieldInput({ 
  field, 
  value, 
  onChange, 
  disabled, 
  placeholder = 'Value',
  className 
}: SmartFieldInputProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const options = field?.options

  const filteredOptions = useMemo(() => {
    if (!options) return []
    if (!searchTerm) return options
    const term = searchTerm.toLowerCase()
    return options.filter(opt => 
      opt.label.toLowerCase().includes(term) || 
      String(opt.value).toLowerCase().includes(term)
    )
  }, [options, searchTerm])

  const hasOptions = options && options.length > 0
  const hasManyOptions = options && options.length > 20

  if (!hasOptions || hasManyOptions) {
    if (!hasManyOptions) {
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      )
    }

    const selectedOption = options?.find(opt => String(opt.value) === value)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
            disabled={disabled}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : value || placeholder}
            </span>
            <CaretDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex flex-col">
            <div className="border-b p-2">
              <div className="relative">
                <MagnifyingGlass 
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" 
                  size={16}
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search or enter custom value..."
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {searchTerm && !filteredOptions.some(opt => String(opt.value) === searchTerm) && (
                  <button
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      onChange(searchTerm)
                      setOpen(false)
                      setSearchTerm('')
                    }}
                  >
                    Use custom value: <span className="font-mono">{searchTerm}</span>
                  </button>
                )}
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground",
                      String(option.value) === value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      onChange(String(option.value))
                      setOpen(false)
                      setSearchTerm('')
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                {filteredOptions.length === 0 && !searchTerm && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No options available
                  </div>
                )}
                {filteredOptions.length === 0 && searchTerm && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No matches found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
