import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/se
import { bullhornAPI } from '@/lib/bullhorn-api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/

  onLog: (operation: string, status: 'success' | 'err

  id: number
  description?: string
  dateLastModified?: number
  expirationDate?: number

    lastName: string
  billRates?: any[]
}

  title: string
  amount?: n
}
export function RateCa
  const [searchId, s
  const [loading, setLoadin
  const [createDialogOpe
    title: '',
    effecti
  })
  const handleLookupB
      toast.error('P
   
    setLoading(true
      const respon
 

      if (response.data && r
        toas
          rateC
        })
        toast.err
        onLog('
 

      onLog('Rate Card Lookup', 'error', 'Failed to lookup rate ca
      setLoading(false)
  }
  const handleSearchByTitle = async () => {
      toast.error('Please enter a search term')
    }
    setLoading(true)
      const response = await bullhornAPI.query('Bi
        fields
        orderBy: '-d

        setRateCard(re
    

      } else {
        setRateCard(
      }
      consol
     

    }

    if (!newRateCard.title) {
      return

    try {
        

        payload.description = newRateCard.description
      if (newRateCard.effectiveDate) 
      }
        payload.expirationDate = new Date(newRateCard.expirationDate).getTime()


        to
        setNew
        const createdCard = await bullhorn
          fields: 'id,tit
        })
       
        }
        onLog('Rate Card Create', 'success', `Created
          title: newRateCard.title
      } else {
        onLog('Rate Card Create', 'error', 'Failed to create rate card', { response })
    } catch (er
      toast.error('Fail
    }
   

    if (!timestamp) return '-'
  }
  return (
      <Card>
     

                <Car
         
              </div>
            <Button onClick={() => setCre
              Create Rate Card
          </div>
        <CardContent>
        

              </TabsTrigger>
                <CreditCard size={18}
              </TabsTrigger>

              <div className="spac
                  <Label htmlFor="search-id
          
              
                      value={searchId}
                      onK
                    <Button onClick={handleLookupById} disabled={loading}>
       
                  </d


                  <Labe
                    <Input
               
                      o
     
   

                </div>
            </TabsContent>
            <TabsContent value="details" 
            
     

                    
         
                  </div>
                  {rateCard.desc
       



       
                      <div>{formatDate
                    <div>
       
                    <div>
                      <div>{formatDate(rateCard.dateAdded)}</div>
       

                  </div>

                      <Label classNam
                        {rateCard.owner.firstName} {rat
                    </div>

        
                      <div className="space-y-4">
                          <div>
                            <Badge variant="secondary" className="ml-2">{rateCard.billRates.length}</Ba
                  
          
        
                        )}
                    </>
         

        </CardContent>

        <DialogContent>
          
              
          </DialogHeader>
            <div className="space-y-2">
       
                place
                onChange={(e) => setNewRateCard({ ...
            </div>
              <Label htmlFor="new-description">Description</Label>
               
                value={
     
   

                <Input
                  type="date"
                  onChange={(e) => setNewRateCard({
   

          
                  value={newRat
            
            </div>
          <DialogFooter>
              Cancel
            <Button onClick={handleCreateRateCard} disabled={loading}>
              Creat
          </DialogFooter>
      </Dialog>
  )


            </div>




          </div>
        </CardHeader>
        <CardContent>































































































































        </CardContent>
      </Card>





























































    </div>
  )
}
