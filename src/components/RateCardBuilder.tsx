import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, S
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import Papa from 'papaparse'
interface RateCardBuilderProps {
}
interface RateCardVersion {
  name: string


  id: number
}

interface RateCardVersion {
  id: number
  name: string
  effectiveDate: number
  effectiveEndDate?: number
}

interface RateCardLineVersion {
  id: number
  rateCardLine: { id: number }
  rateCardVersion: { id: number }
  rate: number
  markupPercent?: number | null
}

interface RateCardLine {
  id: number
  externalID: string
  earnCode: string
  title: string
  unitOfMeasure: string
  lineVersion?: RateCardLineVersion
}

interface NewRateCardLine {
  tempId: string
  earnCode: string
  title: string
  unitOfMeasure: string
  rate: number
interface FieldMapping 
 

  name: string
  type: string
  required?: bo
}
export functio
  const [rateCardVersion
    version: RateCar
 

  const [newRateCardName
  const [csvLines, 
  const [showMappingDia
 

  useEffect(() => {
  }, [])
  const loadRat
      const me
        .filter((f
          name: f.na
          type: f.ty
 

    } catch (error) {
    }

    if (!rateCardVersionId.trim()) {
      return

    try {
        'id',
        'effectiveDate',
      ])
      if (!versionResponse.data) {
      }
      const linesResponse = await bullhornAPI.query({
        where: `rateCardVersion.id=${rateCardVersionId}`,
        count: 500

        id: lineVersion.rateCardLine.id,
        earnCode: lineVersion.rateCardLine.earnCode || ''
        unitOfMeasure: lineVersion.rateCardLine.unitO

          rateCardV
          markupPercent: lineV
      })

        lines: linesWithDetails

      if (!existing) {
          ...(current || []),
        ])

      onLog('Rate Card 
        versionName: versionRespons
      })
      console.error('Failed to 
      onLog('Rate Card Load', '
      setLoading(false)
  }
  const updateLineRate = async (
      await bullhornA
      setRateCardData(prev => {
     
   

          )
      })
      toast.success('Rate updated successfully')
    } catch 
     


    try {
      
        if (!
          ...pr
            line.lineVer
              : line
        

      onLog('Rate Card Update', 's
      console.error('Failed to update markup:', error)
      o

  const addNewLine = () => {
      tempId: `temp-${Date.now()}`,
      title: '',
      rate: 0,
    }])



    setNewLines(newLines.map(line => 
    ))

    if (!rateCardData?.version) {
      return

    if (validLines.length ===
      return

    try {
        const rateCardLineResponse = await bullhornAPI.ins
         
         

          rateCardLine:
          rate: line.rate,
        })


        lineCount: validLines.length

      await loadRateCard()
      console.error('Failed t
      onLog('Rate Card Insert', 'error', 'Failed to save new rate card lines',
      setL
  }


    const rows = rateCardData.lines.map(line => [
      line.title,
      line.lineVersion?.rate || 0,
    ])
    cons
      ...rows.map(row

    const url = URL.createObjectURL(blob)
    a.href = url
    a.click()

    o
   

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!
    Papa.parse(file, {
      
        try {
            toast.error('CSV f
          }
          const fi
          
          setRawCsvData(results.data as any[])
          const hasStandardColumns = 
            columns.
          
         
        

                markupPercent: row['Markup %'] |
              
                const
                  line[key] = row[key]
              })
              return line

   

            }
         
            onLog('CSV Upload', 'success', `Parsed ${validLines.length} rate card lines from CSV`,
      
          } else {
            toast.info(`Found 
        } catch 
          toast.er
        }
      error: (error) => {
        toast.error('Failed to read CSV file')
      }

      fil
  }

      const parsedLines: CSVRateCardLine[] = rawCs
          earnCode: '',
          unitOfMeasu
        }
        fieldMappings.forEach(mapping => {
          if (value !== undefined && value !== null) {
     
   

        
          const isMapped = fiel
            line[key] = row[key]
        })
        return l

      
        toast.error('N
      }
   

        mappingCount: fieldMappings.length,
      })
   


    setFieldMappings([...fieldMapping

    se


    ))

    if (!newRateCardName.trim()) {
      return


    }
    if (csvLines.length === 0) {
      return

    t

        name: newRat
      })
      const versionId = versionRespons
      toast.success(`Created rate card version: ${newRateCardName}`)
        versionId,
        effectiveDate: newRa

      let errorCount = 0
      for 

            title: line.title,
            externalID: `${line.earnCode}-${Date.now()}-${Math.random
          
            if (!['earnCod
            }



            rate: line.rate,
          })
          successCount++
          console.error(`Failed to c
        

        toast.warning
          versionId,
          errorCount
      } else {
        onLog('Rate Card Create', 'success', 
          lineCount: successCount
      }
      setSavedRateCards
     


      setRateCardVersionId(St
      

      toast.error('Failed to create rate card')
    } finally {
    }

    setCsvLines(csvLines.

    const headers = ['Earn Code', 'Title', 
      


      headers.join(','),
    ].join('\n')
    const blob =

    a.download = 'rate-card-template.csv'
    URL.revokeObjectURL(url)
    toast.success('Downloaded CSV templat

    <div className="space-y-6">
        <Card
            <CreditCard size

                Load existing rate cards or cr
            </div>
        </CardHeader>
          <Tabs value={activeMode} onValue
      
   

                Create New
            </TabsList>
            <TabsCont

                  <Inp
                   
                    value={
                    onKeyDown=
             
                  <Button onClick={loadRateCard} disabled={
                    Load Rate Card
                </


                  <div className="flex flex-wrap 
                      <Button
          
                        onClick=
                          setTimeout(() => loa
          
                      </Button>
                  </div>
              )}

          
                  <Label htmlFor="n
                    id="new-rate-card-name"
                    value={newRateCardName}
                  />
                <div>
                  <Input
                    type="date"
                    onChange={(e) => setNewRateCardEffectiveDate(e.target.value)}
               

                <div className="flex items-cent
                  <Button variant="outline" size="sm" onClick={downloadCSVT
                    Download Template
                </div>
                <
                
              
                    <Uplo
              

                    accept=".csv"
            
                </div>
                {csvLines.length > 0 && (
                    
             

                          <ArrowsLe
                        </Button>
                          Clear All
                      </div>
                    <div className="max-h-
              
                  
                          <div classNa
                          <div className="col-span-1 flex justify-end">
           
                         
                      ))}
                        <div className="text-xs t
                        </div>
         
        
                {csvLines
                    <AlertDescription>
                    </AlertDescription>
                )}

      

                  <Plus />
                </Button>
     
   

        <DialogContent className="ma
         
              Map your CSV columns to the corresponding RateCardLine fields
          </DialogHeader>
          <div classNam
              <Label
                <Plus size={16} 
              </B

        
                  <Label className="text-x
                    <SelectTrigger>
                    </SelectTrigger>
                      {csvColumns.map(col => (
                      ))}
                  </
                <div className="col-span-1 flex i
             
           
          
        
                      <SelectItem value="
                      <SelectItem value="unitOfMeasure">Unit of Measure
                      <Sel
                        .filter(
           
          
        
                </d
        

              </div>

              <Alert>
                  Click "Add Mapping" to map CSV columns to RateCardLine fields.
              


              </Button>
                Apply Mappings
            </div>
        </DialogContent>

        <>
        
                <div>
                  <CardDescription>
                    {rateCardData.version?.effectiv
     
   

                </Button>
            </CardHeader>
   

                      <Label className="text-xs">
                    </div>
   

                      <Label className="text-xs">Unit</Label>
                    </div>
                      <Label htmlFor={`rate-${line.id}`} cla
      
   

                      />
                    <div className
                      <Input
            
     

                    </div>
                      <div className="text-xs text-
            
     

                  <AlertDescript
                  </AlertDescription>
            
     

              <div c
         
                </div>

      const versionResponse = await bullhornAPI.createEntity('RateCardVersion', {
            </CardHeader>
              {newLines.map((line) =
        

                      value={line.earnCode}

                    />
                  <div className="col-span-3">
                  
                      value={l
                      placeholder="Regular Time
        

                    <Selec
                        

                        <SelectItem 
             
                      </SelectContent>
                  </div>
                    <Label htm
                      id={`new-rate-${line.tem
                      step="0.01"
           
          
                  <div className="col-span-2
                    <Input
                      type="number"
             
            

          const rateCardLineResponse = await bullhornAPI.createEntity('RateCardLine', rateCardLineData)

          await bullhornAPI.createEntity('RateCardLineVersion', {

                <div className="flex justify-en
                    Clear Al
                  <Button onClick={saveNewLines} disa
            


                <Alert>
                    Click "Add Line" to create new rate card lines.
                </Aler
         
       

}

































































































































































































































































































































































































































































































































