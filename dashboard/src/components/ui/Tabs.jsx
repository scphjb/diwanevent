import * as React from "react"
import { cn } from "../../utils/cn"

const TabsContext = React.createContext(null)

const Tabs = ({ children, defaultValue, className }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("space-y-4", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = ({ children, className }) => (
  <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-slate-900 p-1 text-slate-400", className)}>
    {children}
  </div>
)

const TabsTrigger = ({ value, children, className }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        activeTab === value ? "bg-slate-800 text-white shadow-sm" : "hover:bg-slate-800/50 hover:text-slate-200",
        className
      )}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ value, children, className }) => {
  const { activeTab } = React.useContext(TabsContext)
  
  if (activeTab !== value) return null
  
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
