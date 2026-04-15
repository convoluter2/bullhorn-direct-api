import { useState } from 'react'
import { Button } from '@/components/ui/button'

  onLog: (operation: string, status: 'success
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard size={24} className="text-primary" weight="duotone" />
          <div>
            <CardTitle>Rate Card Builder</CardTitle>
            <CardDescription>
              Build and manage Bullhorn rate cards
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            This component is currently being rebuilt. Please check back soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
  const [processing, setProc
  const [previewM

 

      earnCodeGroupName: '
      lines: [
          earnCodeId: '
          payMultiplier: '1',
 

          customText1: '',
        }
    }

    const file = even

      let hea


        rows = result.rows
        const result = await parseExcel(file)
        rows = result.rows
        toast.error('Unsupported file type. Please up
      }
      setCsvData({ headers, rows })
      toast.success(`Loaded ${rows.length} rows from 

    }
    if (fileInputRef.current) {
    }

    const configs: RateCar

