import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Swap, Check, Plus } from '@phosphor-icons/react'
import type { SavedConnection } from '@/components/ConnectionManager'

interface ConnectionSwitcherProps {
  connections: SavedConnection[]
  currentConnectionId?: string
  onSelectConnection: (connection: SavedConnection) => void
  onManageConnections: () => void
  onNewConnection: () => void
}

export function ConnectionSwitcher({
  connections,
  currentConnectionId,
  onSelectConnection,
  onManageConnections,
  onNewConnection,
}: ConnectionSwitcherProps) {
  const [open, setOpen] = useState(false)

  const currentConnection = connections.find(conn => conn.id === currentConnectionId)
  const otherConnections = connections.filter(conn => conn.id !== currentConnectionId)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Swap />
          {currentConnection ? (
            <span className="font-medium">{currentConnection.name}</span>
          ) : (
            <span>Switch Connection</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Switch Connection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {currentConnection && (
          <>
            <div className="px-2 py-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">Current Connection</span>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-accent" weight="bold" />
                  <span className="font-medium">{currentConnection.name}</span>
                </div>
                <div className="text-xs pl-5 truncate">User: {currentConnection.username}</div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        {otherConnections.length > 0 ? (
          <>
            <div className="px-2 py-1.5">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Available Connections
              </div>
            </div>
            {otherConnections.map((connection) => (
              <DropdownMenuItem
                key={connection.id}
                onClick={() => {
                  onSelectConnection(connection)
                  setOpen(false)
                }}
                className="cursor-pointer"
              >
                <div className="flex flex-col gap-1 flex-1">
                  <div className="font-medium">{connection.name}</div>
                  <div className="text-xs text-muted-foreground">
                    User: {connection.username}
                  </div>
                  {connection.lastUsed && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {new Date(connection.lastUsed).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : (
          !currentConnection && (
            <>
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No saved connections found
              </div>
              <DropdownMenuSeparator />
            </>
          )
        )}
        
        <DropdownMenuItem
          onClick={() => {
            onNewConnection()
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <Plus size={16} className="mr-2" />
          <span>New Connection</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => {
            onManageConnections()
            setOpen(false)
          }}
          className="cursor-pointer"
        >
          <Swap size={16} className="mr-2" />
          <span>Manage All Connections</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
