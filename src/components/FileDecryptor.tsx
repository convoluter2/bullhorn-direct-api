import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LockKeyOpen, DownloadSimple, Upload } from '@phosphor-icons/react'
import { toast } from 'sonner'

const decryptData = async (encryptedData: ArrayBuffer, password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  
  const data = new Uint8Array(encryptedData)
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 28)
  const encrypted = data.slice(28)
  
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
  
  return decoder.decode(decryptedData)
}

export function FileDecryptor() {
  const [password, setPassword] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDecrypt = async () => {
    if (!selectedFile) {
      toast.error('Please select an encrypted file')
      return
    }

    if (!password) {
      toast.error('Please enter the decryption password')
      return
    }

    setIsDecrypting(true)
    const toastId = toast.loading('Decrypting file...')

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const decryptedContent = await decryptData(arrayBuffer, password)
      
      const blob = new Blob([decryptedContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = selectedFile.name.replace('.enc', '_decrypted.csv')
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)

      toast.success('File decrypted successfully', { id: toastId })
      setPassword('')
      setSelectedFile(null)
      
      const fileInput = document.getElementById('encrypted-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error('Decryption error:', error)
      toast.error('Decryption failed. Please check your password.', { id: toastId })
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyOpen size={24} className="text-accent" weight="duotone" />
          Decrypt Encrypted Export
        </CardTitle>
        <CardDescription>
          Decrypt password-protected WFN export files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use this utility to decrypt files that were exported with the "Unencrypted PII (Password Protected)" option.
            You will need the password that was used during the export.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="encrypted-file" className="flex items-center gap-2">
            <Upload size={16} />
            Encrypted File (.enc)
          </Label>
          <Input
            id="encrypted-file"
            type="file"
            accept=".enc"
            onChange={handleFileSelect}
            disabled={isDecrypting}
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="decrypt-password" className="flex items-center gap-2">
            <LockKeyOpen size={16} />
            Decryption Password
          </Label>
          <Input
            id="decrypt-password"
            type="password"
            placeholder="Enter the password used during export"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isDecrypting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedFile && password) {
                handleDecrypt()
              }
            }}
          />
        </div>

        <Button
          size="lg"
          onClick={handleDecrypt}
          disabled={isDecrypting || !selectedFile || !password}
          className="w-full gap-2"
        >
          <DownloadSimple size={20} />
          {isDecrypting ? 'Decrypting...' : 'Decrypt and Download CSV'}
        </Button>
      </CardContent>
    </Card>
  )
}
