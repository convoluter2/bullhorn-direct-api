import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from './CodeBlock'
import type { BullhornSession } from '@/lib/types'

interface ApiExamplesProps {
  entityName: string
  session: BullhornSession | null
}

export function ApiExamples({ entityName, session }: ApiExamplesProps) {
  const restUrl = session?.restUrl || 'https://rest.bullhornstaffing.com/rest-services/{corpToken}'
  const token = session?.BhRestToken || '{BhRestToken}'

  const getExample = `# GET - Retrieve a single ${entityName} by ID
curl "${restUrl}entity/${entityName}/123?fields=*&BhRestToken=${token}"

# GET with specific fields
curl "${restUrl}entity/${entityName}/123?fields=id,name,dateAdded&BhRestToken=${token}"`

  const searchExample = `# SEARCH - Query ${entityName} entities
curl "${restUrl}search/${entityName}?query=id>0&fields=*&count=10&BhRestToken=${token}"

# SEARCH with filter
curl "${restUrl}search/${entityName}?query=dateAdded>1234567890&fields=id,name&orderBy=dateAdded&BhRestToken=${token}"`

  const postExample = `# POST - Create a new ${entityName}
curl -X POST "${restUrl}entity/${entityName}?BhRestToken=${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Example Name",
    "dateAdded": ${Date.now()}
  }'`

  const putExample = `# PUT - Update an existing ${entityName}
curl -X PUT "${restUrl}entity/${entityName}/123?BhRestToken=${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Name"
  }'`

  const deleteExample = `# DELETE - Remove a ${entityName}
curl -X DELETE "${restUrl}entity/${entityName}/123?BhRestToken=${token}"`

  const jsGetExample = `// JavaScript GET Example
const response = await fetch(
  '${restUrl}entity/${entityName}/123?fields=*&BhRestToken=${token}'
);
const data = await response.json();
console.log(data);`

  const jsSearchExample = `// JavaScript SEARCH Example
const response = await fetch(
  '${restUrl}search/${entityName}?query=id>0&fields=*&count=10&BhRestToken=${token}'
);
const result = await response.json();
console.log(result.data); // Array of entities
console.log(result.total); // Total count`

  const jsPostExample = `// JavaScript POST Example
const response = await fetch(
  '${restUrl}entity/${entityName}?BhRestToken=${token}',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Example Name',
      dateAdded: ${Date.now()}
    })
  }
);
const result = await response.json();
console.log(result.changedEntityId); // New entity ID`

  const jsPutExample = `// JavaScript PUT Example
const response = await fetch(
  '${restUrl}entity/${entityName}/123?BhRestToken=${token}',
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Updated Name'
    })
  }
);
const result = await response.json();
console.log(result); // Update result`

  return (
    <div className="space-y-6">
      <Tabs defaultValue="get" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="get">GET</TabsTrigger>
          <TabsTrigger value="search">SEARCH</TabsTrigger>
          <TabsTrigger value="post">POST</TabsTrigger>
          <TabsTrigger value="put">PUT</TabsTrigger>
          <TabsTrigger value="delete">DELETE</TabsTrigger>
        </TabsList>

        <TabsContent value="get" className="space-y-4 mt-4">
          <CodeBlock code={getExample} language="bash" title="cURL" />
          <CodeBlock code={jsGetExample} language="javascript" title="JavaScript" />
        </TabsContent>

        <TabsContent value="search" className="space-y-4 mt-4">
          <CodeBlock code={searchExample} language="bash" title="cURL" />
          <CodeBlock code={jsSearchExample} language="javascript" title="JavaScript" />
        </TabsContent>

        <TabsContent value="post" className="space-y-4 mt-4">
          <CodeBlock code={postExample} language="bash" title="cURL" />
          <CodeBlock code={jsPostExample} language="javascript" title="JavaScript" />
        </TabsContent>

        <TabsContent value="put" className="space-y-4 mt-4">
          <CodeBlock code={putExample} language="bash" title="cURL" />
          <CodeBlock code={jsPutExample} language="javascript" title="JavaScript" />
        </TabsContent>

        <TabsContent value="delete" className="space-y-4 mt-4">
          <CodeBlock code={deleteExample} language="bash" title="cURL" />
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive-foreground">
            ⚠️ <strong>Warning:</strong> DELETE operations are permanent and cannot be undone. Use with caution.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
