import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/tex
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separato
import { ArrowsClockwise, Upload, Database, Warning, CheckCircle, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ArrowsClockwise, Upload, Database, Warning, CheckCircle, X } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import Papa from 'papaparse'

}
interface FieldInfo {
 

  maxLength?: number
}
interface MassU
 


  const [entit
  const [availa
  const [field
  const [csvFile, 
  const [isLoadingEn
  const [isProcessin
  const [results, setResults] = useState<MassUpdate
 

  useEffect(() => {
      loadFields()
      setAvailableFi
    }

 

        .filter(id => id && /^\d+$/.test(id))
      setParsedIds([...new Set(ids)])
    } else {
    }

    setIsLoadingEntities(true)
      console.log('🔍 Fetching mass update entities...
      console.log('✅ Mass update entities:', response)
      if (response && Array.isArray(response.entities)) {
          entity,
        }))
        toast.success(`Loaded ${entityList.length} entiti
          entityCount: entityList.length
      } else {

      console.error
      toast.error(
        

    }

    if (!selectedE
    setIsLoa
    setSelectedField('')
    try {
     
      

          label: fi
          dataType: field.
          maxLength: field
        }))
        toast.success(`Loaded
          entity: selectedEntity,
        })
        throw new Error('Invalid resp
    } catch (error) {
      const 
      onLog('Mass Upda
     
    } finally {


    const file = event.target.

    setIdsInput('')
    Papa.parse(file, {
      skipEmptyLines: true,
      
        const idColumn = results.meta.fields?.find(
        )
        if (!idCo
          setCsvFile(nu
        }
        const ids = results.dat
            const id = row[idColumn]
          })

        to
      error: (
        toast.error(`Failed to parse CSV: ${error.
      }
  }
  const clearIds = () => {
    setCsvFile(null)
  }
  const executeMassUpdate = async () => {
      toast.error('Please s
    }
    if (!select
      return

   

    if (parsedIds.length === 0) {
      return

      `Are you sure you want
      `Value: ${fieldValue
    )
    
    setIs
    setResults([])
    try {
        entity: selectedEntity,
      
      })
      const updateData = {
      }
      const response = await bullhornAPI.ma


        setResults(response.results
        const successCount = response

          t
          toast.success(`Successfully

          `Mass update completed: ${successCount} success, ${errorCount} failed`, {
          field: selectedField,
          totalIds: parsedIds.length,
          
        })
        throw new Error('Invalid response format')
    } c
      const errorMess
      onLog('Mass Update', 'error', 'Mass update failed', {
        field: selectedField,
        idCount: parsedIds.length,
      })
    } finally {
    }


    <div className="space-y-6">
     
   

            Bulk update a single field across multiple records using the Bu
        </CardHeader>
          <Alert>

            </AlertD


              <div cla
                  v
                  disabled=
                  <SelectTrigg
                  </SelectTrigger>
        
                        {entity.label}
                    ))}
         
        
                  onClic
                >
                </Button>
              {e
         


              <>
                
                  <Label htmlFor="field-select">Field to Update</Label>
            
                    disabled={isLoadingFields || isP

                        isLoadingFields
                          : availableFields.length === 0 
        
                    </Sel
                      {availableFields.map(field =
                          {field.label} ({field.name})
                        
       
      
   


                  <
                    
                    
   

                    </div>
                      <spa
                    <p className="text-xs te
            
     

                  <Input
                    value={fieldValue}
            
     

                      {fieldValue.l
                  )}



                  <div className=
                      Upload CSV (must contain an "
            
     

                        disabl
                      {csvFile && (
                          variant="
                          onClick=
                            setParsed
     

                    </div>

                      </p
                  
                  

         
                  <div className="space-y-2">
                      Paste com
                    <Textarea
                      valu
                      placeholder
        

                  {parsedI
                      <div classNam
       

                          Clear
                      </div>

                      



        
                    !selectedEntity ||
                    !fieldValue.trim() ||

                  className="
                >
                
                    : `Update ${parsedIds.length} Record${parsedIds.len
         

          {isProcessing && (
              <Progress value={progress} />
                Processing mass u
            </div>

            <div className="space-y-4
              <div>
                <div 
                    <div
          
              
                      }`}
       
                     
                              <Warning className="t
                              <CheckCircle className="text-accent" size={16} />
                            <span className="text-sm fon
                            </span>
                              {
                          </d
                          
                            </p>
                        </d
        
                </di
            </d
        </CardContent>
    <
}

































































































































































































































































































