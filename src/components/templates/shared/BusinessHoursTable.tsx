import type { BusinessHours } from '@/types/domain'

interface BusinessHoursTableProps {
  hours: BusinessHours | null
  className?: string
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function BusinessHoursTable({ hours, className = '' }: BusinessHoursTableProps) {
  if (!hours) return null

  return (
    <table className={`w-full text-left ${className}`}>
      <tbody>
        {DAY_ORDER.map((day) => {
          const dayHours = hours[day as keyof BusinessHours]
          return (
            <tr key={day} className="border-b border-gray-100 last:border-0">
              <td className="py-2 font-medium">{DAY_LABELS[day]}</td>
              <td className="py-2 text-right">
                {!dayHours || dayHours.closed || !dayHours.open || !dayHours.close ? (
                  <span className="text-gray-400">Closed</span>
                ) : (
                  `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
