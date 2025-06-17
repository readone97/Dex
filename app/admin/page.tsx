"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  User,
  Wallet,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { NotificationsPopover } from "@/components/notifications-popover"
import { MerchantTransactionTable } from "@/components/merchant-transaction-table"

export default function AdminDashboardPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState("today")

  // Real transactions from Supabase
  const [transactions, setTransactions] = useState([])

  // Stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    completedCount: 0,
    totalVolume: "₦0",
    todayVolume: "₦0",
  })

  // Simple fetch function
  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      console.log('Fetching from Supabase...')
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')

      if (error) {
        console.log('Supabase error:', error)
        toast({
          title: "Error",
          description: "Could not fetch transactions",
          variant: "destructive",
        })
        setTransactions([])
      } else {
        console.log('Fetched transactions:', data)
        setTransactions(data || [])
        
        // Calculate simple stats
        const pending = (data || []).filter(tx => tx.status === 'pending').length
        const completed = (data || []).filter(tx => tx.status === 'completed').length
        const totalVol = (data || []).reduce((sum, tx) => sum + (Number(tx.to_amount) || 0), 0)
        
        setStats({
          pendingCount: pending,
          completedCount: completed,
          totalVolume: `₦${totalVol.toLocaleString()}`,
          todayVolume: `₦${totalVol.toLocaleString()}`,
        })
        
        if (data && data.length > 0) {
          toast({
            title: "Success",
            description: `Loaded ${data.length} transactions`,
          })
        }
      }
    } catch (err) {
      console.log('Error:', err)
      toast({
        title: "Error",
        description: "Connection failed",
        variant: "destructive",
      })
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Format for table
  const formatTransactions = () => {
    return transactions.map(tx => ({
      id: tx.transaction_id || tx.id,
      userId: tx.wallet_address || 'Unknown',
      userName: tx.account_name || 'Unknown',
      fromAmount: tx.from_amount?.toString() || '0',
      fromCurrency: tx.from_currency || 'N/A',
      toAmount: tx.to_amount?.toLocaleString() || '0',
      toCurrency: tx.to_currency || 'NGN',
      bankName: tx.bank_name || 'N/A',
      accountNumber: tx.account_number || 'N/A',
      accountName: tx.account_name || 'N/A',
      status: tx.status || 'pending',
      createdAt: tx.created_at || new Date().toISOString(),
      updatedAt: tx.updated_at || null,
      notes: tx.notes || "",
    }))
  }

  // Filter transactions
  const filteredTransactions = formatTransactions().filter((tx) => {
    if (activeTab === "pending" && tx.status !== "pending") return false
    if (activeTab === "completed" && tx.status !== "completed") return false
    if (activeTab === "rejected" && tx.status !== "rejected") return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        tx.id.toLowerCase().includes(query) ||
        tx.userName.toLowerCase().includes(query) ||
        tx.accountNumber.includes(query)
      )
    }
    
    return true
  })

  // Fetch on mount
  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-primary">
              Amigo Exchange <span className="text-sm font-normal text-muted-foreground">Admin</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <NotificationsPopover />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span>Admin</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage user crypto-to-fiat conversions</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button onClick={fetchTransactions}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.pendingCount}</div>
                <p className="text-xs text-muted-foreground">Requires action</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.completedCount}</div>
                <p className="text-xs text-muted-foreground">Successfully processed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.totalVolume}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Merchant Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦2,500,000</div>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>Review and process user conversion requests</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      className="pl-8 w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending
                    <Badge variant="secondary" className="ml-2">
                      {stats.pendingCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  <TabsTrigger value="all">All Transactions</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading transactions...</div>
                    </div>
                  ) : (
                    <MerchantTransactionTable
                      transactions={filteredTransactions}
                      onViewTransaction={(id) => console.log('View transaction:', id)}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 
