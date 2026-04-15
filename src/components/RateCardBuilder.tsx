import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHe
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Plus, Trash, CheckCircle, XCircle, File, Lightning, Clock, DownloadSimple, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { parseCSV, parseExcel } from '@/lib/csv-utils'

interface RateCardLine {
  earnCodeName?: string
 

  markupValue: string
  customFloat1: stri

  earnCodeGroupId: stri
  isBase: boolean
}
interface RateCard
  effectiveDate: string
}
interface ProcessingR
  status: 'success' | 
 


  const [csvData, setCsvD
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

      h.toLowerCase
      h.toLowe
    
      toast.error('CSV mu
    }
    rows.forEach(row => {
      if (placementId)
          placementGroups.set(
        placementGroups
    })
    placementGroups.forEac
      
        h.toLowerCase().tr
      )


    

        const earnCodeIdIndex = headers.findIndex(h => 
          h.toLowerCase().trim() === 'ea
        const isBaseI


        const earnCodeId = earnC
          (row[isBaseIndex]?.tr


          lineGroupMap.set(earnCodeGroupId,

          earnCodeId,
          payRate: getColumnValue(headers, row, ['payrate', 'pay rate']) || '
          billRate: getColumnValue(headers, r
          markupValue: getColumn
          customFloat1: ge

      })
      const li
       

      configs.push({
        effectiveDate,
      })

    toast.success(`Parsed ${configs.length} rate

    f

      }
    return ''

   

        isBase: group.isBase,
        placementRateCardLines: group.li
            earnCode: { id: parseInt(line.earnCodeId) }

          if (line.payRate) lineData.payRate = line.
          if (line.billRate) lineData.billRate = l
          if (line.markupValue) lineData.markupVal
          if (line.customFloat1) lineData.cu
     
    

  }
  const proc
     

    setProcessing(true)
    const newResults: ProcessingResult[] = []
    for (let i = 0; i < 
      
        const payload = buildPayload(config)
        c
        const response = await bullhornAPI.updateEn
       
      

        })
        onLog('RateCard Create', 'succe
      
          lineGroupCount: config.lineGroups.length,
        })
        toast.success(`Rate card created for placem
       
        newResults.push({

          error

          placementId: config.placem
        })
        toast.error(`Failed for placement ${config.placeme

    }
    setProcessing(false)
    const errorCount = newResults.filter(r => r.statu
    toast.success(`Completed: ${successCount} succe

    setManualLineGroups([
      {
        isBase: false,
         

            billMultiplier: '1',
            markupPercent: '',
            customText1: '',
          }
      }

  const removeLineGroup = (groupIndex: number) => {

  const addLineToGroup = (groupIndex: number) => 
    updated[groupIndex].lines.push({
      pay

      markupPercent: '',
      customText1: ''
    })
  }
  const removeLineFromGroup = (groupIndex: number, lineIndex: number) => {
    updated[groupIndex].lines = updated[groupIndex].lines.filter((_, i) => i !== l
  }
  const updateLineGroup = (groupIndex: number, field: keyof RateCardLineGroup, value: any) 
    updated[groupIndex] = { ...updated[groupIndex], [field]: value }
  }
  const u

      [field]: value
    setM

    if (!manualPlacementId || !manualEffectiveDate) {
      return

      g.earnCodeGroupId &


    }
    const config: Ra
      effectiveDate: m
        g.earnCode
    }
    se

  return (
      <Card>
   

          <CardDescription>
          </CardDescription>
        <CardContent>
            <TabsList className="grid w
              <TabsTrigger value

     
             
   

                  </div>
              </Alert>
              <div className="flex gap-4">
                  <Label htmlFor="csv-uplo
                    id="csv-upload"
                    type="fil
                    onChange={handleFileUpload}
                  />
              </div>
              {csvData && (
           

                      size="sm"
                    >
                      {previewMode ? 'Hide' : 'Show'} Data
                  </div>
                  {previewMode && (
                      <Table>
                          <TableRow>
                              <TableHead key={i} className="font-mono text

                         
          
         
     

                  
   

                </div>
            </TabsContent>
            <TabsContent value="manual" class
            
     

                    pla
                  
                <div>

                    type="date"
                    onChange={(e)
      
           
              <div className="space-y-4">
        
                    variant="outline"

                    <Plus size={16} />


                  <Card key={groupIndex}>
                      <div c
                          Line Group {groupIndex + 1
                        <Button
                          size="sm"
          

                      </div>
                    <CardContent className
                        <div>
                          <Input
                            onChange={(e) => update
                  
          

                              id={`is-base-${groupIndex}`}
                       
                            <Label htmlFor={`is-base-${groupIndex}`}>Is Base Group</Label>
        

                        <div className="fl
                          
                            size="sm"
               
          

                        {group.lines.map((line, lineIndex) => (
                            <CardContent c
                                <span className="text-xs font-semibold"
          

                                  className="h-6 w-6 p-0"
       

                              <di
     

                        
                                  />
                                <div>
    
                                    onChange={(e) => updateLine(groupIndex, l
   

                                  <L
                         
                          
       
                            
                      
                
           
                           
                               
                        
                                
                         
                              
                            
                            
                            
           
         
       
      
   

                                  <Input
                                    onChange={(e) => updateLine(groupIndex, 
   

                            </CardContent>
                        ))}
                    </CardContent>
                ))}

                <L
              </Button>
          </Tabs>
      </Card>
      {rateCards.lengt
          <CardHeader>
              <span>Ra
      
          <CardContent className
   

                      <div className="flex items-center justify-between">
                          Placement {conf
                        <Badge variant="outline">
                          {confi
   

                        {config.lineGroups.map((group, groupIndex) => (
                            <div classNam
                              {group.isBase && <Badge variant="defau
                            </di
   

                                  {line.billRate && ` BillRate: ${line.billRate}`}
                              ))}
                          </div>
                      </div>
                  </
     

   

            >
              {processing ? 'Processing...' : `Create
          </CardContent>
      )}
     

            <CardDescription>
            </CardDescription>
     

                  <TableRo
                    <TableHead>Placement ID</TableHead>
            
     

                    <TableRow key={i
                        {result.statu
                        ) : (
                        )}
                      <TableCell className="font-mono">{resu
       
     

            </ScrollArea>
        </Card>
   














































































































































































































































































































































































































