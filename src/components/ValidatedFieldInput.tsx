import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CalendarBlank, CaretDown, MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ToOneFieldInput } from '@/components/ToOneFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'

interface ValidatedFieldInputProps {
  field: EntityField | null
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function ValidatedFieldInput({
  field,
  value,
  onChange,
  disabled,
  placeholder = 'Value',
  className
}: ValidatedFieldInputProps) {
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const dataType = field?.dataType?.toLowerCase()
  const dataSpecialization = field?.dataSpecialization?.toLowerCase()
  const hasOptions = field?.options && field.options.length > 0

  const validateAndChange = useCallback((newValue: string) => {
    if (!field || !newValue) {
      setError(null)
      onChange(newValue)
      return
    }

    let validationError: string | null = null

    if (dataType === 'integer' || dataSpecialization === 'integer') {
      if (!/^-?\d+$/.test(newValue)) {
        validationError = 'Must be a whole number'
      }
    } else if (dataType === 'double' || dataType === 'bigdecimal' || dataSpecialization === 'numeric') {
      if (!/^-?\d*\.?\d+$/.test(newValue)) {
        validationError = 'Must be a number'
      }
    } else if (dataType === 'timestamp' || dataSpecialization === 'date' || dataSpecialization === 'datetime') {
      const timestamp = parseInt(newValue)
      if (isNaN(timestamp) || timestamp < 0) {
        validationError = 'Must be a valid timestamp'
      }
    } else if (dataSpecialization === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newValue)) {
        validationError = 'Must be a valid email address'
      }
    }

    setError(validationError)
    onChange(newValue)
  }, [field, onChange, dataType, dataSpecialization])

  useEffect(() => {
    if (value && field) {
      validateAndChange(value)
    }
  }, [])

  if (disabled) {
    return (
      <Input
        value={value}
        disabled
        className={className}
      />
    )
  }

  if (dataType === 'timestamp' || dataSpecialization === 'date' || dataSpecialization === 'datetime') {
    return <DateTimestampInput value={value} onChange={onChange} className={className} />
  }

  if (dataType === 'integer' || dataSpecialization === 'integer') {
    return <IntegerInput value={value} onChange={validateAndChange} error={error} className={className} placeholder={placeholder} />
  }

  if (dataType === 'double' || dataType === 'bigdecimal' || dataSpecialization === 'numeric') {
    return <NumericInput value={value} onChange={validateAndChange} error={error} className={className} placeholder={placeholder} />
  }

  if (dataSpecialization === 'phone') {
    return <PhoneInput value={value} onChange={onChange} className={className} placeholder={placeholder} />
  }

  if (dataSpecialization === 'email') {
    return <EmailInput value={value} onChange={validateAndChange} error={error} className={className} placeholder={placeholder} />
  }

  if (dataType === 'boolean') {
    return <BooleanInput value={value} onChange={onChange} className={className} />
  }

  if (field?.type === 'TO_MANY' || field?.associationType === 'TO_MANY') {
    return (
      <ToManyFilterInput
        field={field}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  if (field?.type === 'TO_ONE' || field?.associationType === 'TO_ONE') {
    return (
      <ToOneFieldInput
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  if (hasOptions) {
    return (
      <OptionsInput
        options={field.options!}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  )
}

function IntegerInput({ 
  value, 
  onChange, 
  error, 
  className, 
  placeholder 
}: { 
  value: string
  onChange: (v: string) => void
  error: string | null
  className?: string
  placeholder?: string 
}) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const val = e.target.value
          if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
            onChange(val)
          }
        }}
        placeholder={placeholder || '0'}
        className={cn(className, error && 'border-destructive')}
      />
      {error && (
        <div className="absolute -bottom-5 left-0 text-xs text-destructive flex items-center gap-1">
          <Warning size={12} />
          {error}
        </div>
      )}
    </div>
  )
}

function NumericInput({ 
  value, 
  onChange, 
  error, 
  className, 
  placeholder 
}: { 
  value: string
  onChange: (v: string) => void
  error: string | null
  className?: string
  placeholder?: string 
}) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const val = e.target.value
          if (val === '' || val === '-' || val === '.' || /^-?\d*\.?\d*$/.test(val)) {
            onChange(val)
          }
        }}
        placeholder={placeholder || '0.00'}
        className={cn(className, error && 'border-destructive')}
      />
      {error && (
        <div className="absolute -bottom-5 left-0 text-xs text-destructive flex items-center gap-1">
          <Warning size={12} />
          {error}
        </div>
      )}
    </div>
  )
}

function PhoneInput({ 
  value, 
  onChange, 
  className, 
  placeholder 
}: { 
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string 
}) {
  const formatPhone = (input: string) => {
    const digits = input.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  return (
    <Input
      type="tel"
      value={value}
      onChange={(e) => {
        const formatted = formatPhone(e.target.value)
        onChange(formatted)
      }}
      placeholder={placeholder || '(555) 123-4567'}
      className={className}
    />
  )
}

function EmailInput({ 
  value, 
  onChange, 
  error, 
  className, 
  placeholder 
}: { 
  value: string
  onChange: (v: string) => void
  error: string | null
  className?: string
  placeholder?: string 
}) {
  return (
    <div className="relative">
      <Input
        type="email"
        inputMode="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'email@example.com'}
        className={cn(className, error && 'border-destructive')}
      />
      {error && (
        <div className="absolute -bottom-5 left-0 text-xs text-destructive flex items-center gap-1">
          <Warning size={12} />
          {error}
        </div>
      )}
    </div>
  )
}

function DateTimestampInput({ 
  value, 
  onChange, 
  className 
}: { 
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [mode, setMode] = useState<'timestamp' | 'picker'>('picker')
  const [open, setOpen] = useState(false)

  const timestamp = value ? parseInt(value) : null
  const date = timestamp && !isNaN(timestamp) ? new Date(timestamp) : undefined

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(String(selectedDate.getTime()))
      setOpen(false)
    }
  }

  const handleTimestampInput = (input: string) => {
    const digits = input.replace(/\D/g, '')
    onChange(digits)
  }

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className
            )}
          >
            <CalendarBlank className="mr-2" size={16} />
            {date ? format(date, 'PPP p') : 'Select date...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex gap-2 mb-2">
              <Button
                size="sm"
                variant={mode === 'picker' ? 'default' : 'outline'}
                onClick={() => setMode('picker')}
                className="flex-1"
              >
                Date Picker
              </Button>
              <Button
                size="sm"
                variant={mode === 'timestamp' ? 'default' : 'outline'}
                onClick={() => setMode('timestamp')}
                className="flex-1"
              >
                Timestamp
              </Button>
            </div>
            {mode === 'timestamp' && (
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => handleTimestampInput(e.target.value)}
                  placeholder="1234567890000"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter Unix timestamp in milliseconds
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onChange(String(Date.now()))}
                  className="w-full"
                >
                  Use Current Time
                </Button>
              </div>
            )}
          </div>
          {mode === 'picker' && (
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function BooleanInput({ 
  value, 
  onChange, 
  className 
}: { 
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const boolValue = value === 'true' || value === '1'

  return (
    <div className="flex gap-2">
      <Button
        variant={boolValue ? 'default' : 'outline'}
        onClick={() => onChange('true')}
        className={cn('flex-1', className)}
      >
        True
      </Button>
      <Button
        variant={!boolValue ? 'default' : 'outline'}
        onClick={() => onChange('false')}
        className={cn('flex-1', className)}
      >
        False
      </Button>
    </div>
  )
}

function ToManyFilterInput({
  field,
  value,
  onChange,
  placeholder,
  className
}: {
  field: EntityField
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const associatedEntity = field?.associatedEntity?.entity || 'related records'
  const [fieldSuffix, setFieldSuffix] = useState('.id')
  const [idsValue, setIdsValue] = useState('')
  
  useEffect(() => {
    if (value) {
      if (value.includes('.')) {
        const parts = value.split('.')
        if (parts.length === 2) {
          setFieldSuffix('.' + parts[1])
          return
        }
      }
      setIdsValue(value)
    }
  }, [])
  
  useEffect(() => {
    onChange(idsValue)
  }, [idsValue, fieldSuffix, onChange])
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            value={idsValue}
            onChange={(e) => setIdsValue(e.target.value)}
            placeholder={placeholder || `Enter ${associatedEntity} ID(s), comma-separated`}
            className={className}
          />
        </div>
      </div>
      <div className="text-xs space-y-1">
        <p className="text-muted-foreground">
          <span className="font-semibold">To-Many field:</span> Enter one or more IDs separated by commas (e.g., "123,456,789").
          {associatedEntity !== 'related records' && ` These should be ${associatedEntity} IDs.`}
        </p>
        <div className="bg-accent/10 border border-accent/20 p-2 rounded space-y-1">
          <p className="font-semibold text-accent-foreground">Recommended operators for to-many fields:</p>
          <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
            <li><span className="font-mono bg-muted px-1 rounded">in_list [...]</span> - Entity has association with ANY of these IDs (most common)</li>
            <li><span className="font-mono bg-muted px-1 rounded">equals</span> - Entity has association with exactly this ONE ID</li>
            <li><span className="font-mono bg-muted px-1 rounded">is_null</span> - Entity has NO associations (leave value empty)</li>
            <li><span className="font-mono bg-muted px-1 rounded">is_not_null</span> - Entity has at least ONE association (leave value empty)</li>
          </ul>
          <p className="text-xs italic mt-2">
            💡 Tip: For multiple IDs, use the <span className="font-mono bg-muted px-1 rounded">in_list [...]</span> operator and enter comma-separated IDs like: 100,200,300
          </p>
        </div>
      </div>
    </div>
  )
}

function OptionsInput({
  options,
  value,
  onChange,
  placeholder,
  className
}: {
  options: Array<{ value: any; label: string }>
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const filteredOptions = searchTerm
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  const selectedOption = options.find(opt => String(opt.value) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
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
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground bg-accent/50"
                  onClick={() => {
                    onChange(searchTerm)
                    setOpen(false)
                    setSearchTerm('')
                  }}
                >
                  Use custom value: <span className="font-mono font-semibold">{searchTerm}</span>
                </button>
              )}
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground',
                    String(option.value) === value && 'bg-accent text-accent-foreground'
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
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
