import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui
import { toast } from 'sonner'
interface StoredData {
  value: any
  hasIssues: boolean

export function Diagno
  const [load
  const scan
    try {
      const data: St
      for (const k
 

        let hasIssues = false
  const [storedData, setStoredData] = useState<StoredData[]>([])
  const [loading, setLoading] = useState(false)

  const scanStorage = async () => {
    setLoading(true)
    try {
      const keys = await spark.kv.keys()
      const data: StoredData[] = []

      for (const key of keys) {
        const value = await spark.kv.get(key)
        const valueStr = JSON.stringify(value)
        const size = new Blob([valueStr]).size

        const issues: string[] = []
        let hasIssues = false

        if (valueStr.includes('candidateSource')) {
                  issues.push('selectedFields array contains can
                }
         

        data.push({
          value,
          hasIssues,
        })

        if (a.hasIssues && !b.hasIssues) return -1
        return b.size - a.size

      
      if (issueCount
      } else {
      }
      console.error('Error scanning storage:', error)
    } finally {
    }

    if (!conf
    try {
      toa

      toast.error('
  }
  const fixCandi
    
      toast.info('No
    }
    if (!c
    }

      try {
        let value = item.value
        if (Array.isArray(value)) {
          if (newValue.length 
        

            const newFiel
      
            }
        }
        if (modified) {
          fixe
      } catch (error) {
      }

    scanStorage()

    scanStorage

    <
   

              Storage Diagnostics
            <CardDescription>
    
         
              variant="outline" 
              onClick={scanStorage}
            >
            </Button>
              <Button 
                size="sm"
     
   

      </CardHeader>
        {storedData.some(d => d.hasIssues) && (
    
              Found {storedData.fi
            </AlertDescription>
        )}
     

                key={item.key}
            
     

                 
                      ) : (
           
                      <Badge
                      </Badge>

                      <div classNam
                          <p key={idx} className="text-xs text-yellow-600 dark:text
                          </p>
                      </div>
                    
           
                      </summary>
                        {JSON.stringify(item.value, null, 2)}
                    </details>
                  
                    variant="ghost"
                    onClick={
             
           
         


          <p className="text-center text-mute
          </p>
      </C
  )



























































































































