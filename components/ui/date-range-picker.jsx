"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function DateRangePicker({
  className,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  placeholder = "Pick a date range"
}) {
  const [isOpen, setIsOpen] = React.useState(false)

  const formatDateRange = () => {
    if (dateFrom && dateTo) {
      return `${format(new Date(dateFrom), "MMM dd, yyyy")} - ${format(new Date(dateTo), "MMM dd, yyyy")}`
    }
    if (dateFrom) {
      return `From ${format(new Date(dateFrom), "MMM dd, yyyy")}`
    }
    if (dateTo) {
      return `Until ${format(new Date(dateTo), "MMM dd, yyyy")}`
    }
    return placeholder
  }

  const handleDateSelect = (date) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      // First date selection or reset
      onDateFromChange(date ? format(date, "yyyy-MM-dd") : '')
      onDateToChange('')
    } else if (date && new Date(date) < new Date(dateFrom)) {
      // Selected date is before the start date, make it the new start
      onDateFromChange(format(date, "yyyy-MM-dd"))
      onDateToChange('')
    } else {
      // Second date selection
      onDateToChange(date ? format(date, "yyyy-MM-dd") : '')
      setIsOpen(false)
    }
  }

  const clearDates = (e) => {
    e.stopPropagation()
    onDateFromChange('')
    onDateToChange('')
  }

  const selectedDays = React.useMemo(() => {
    const days = []
    if (dateFrom) days.push(new Date(dateFrom))
    if (dateTo) days.push(new Date(dateTo))
    return days
  }, [dateFrom, dateTo])

  const modifiers = React.useMemo(() => {
    const mods = {}
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom)
      const to = new Date(dateTo)
      mods.range_start = from
      mods.range_end = to
      mods.range_middle = (day) => {
        return day > from && day < to
      }
    }
    return mods
  }, [dateFrom, dateTo])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateFrom && !dateTo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Select Date Range</h4>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDates}
                  className="h-auto p-1 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click a date to start, then click another to complete the range
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDays}
            onSelect={handleDateSelect}
            modifiers={modifiers}
            numberOfMonths={2}
            className="p-0"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
