"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Transaction interface matches the admin page transaction format
interface Transaction {
  id: string
  userId: string
  userName: string
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  bankName: string
  accountNumber: string
  accountName: string
  status: string
  createdAt: string
  updatedAt: string | null
  notes: string
}

interface MerchantTransactionTableProps {
  transactions: Transaction[]
  onViewTransaction: (id: string) => void
}

export function MerchantTransactionTable({ transactions, onViewTransaction }: MerchantTransactionTableProps) {
  const [sortBy, setSortBy] = useState<string>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Sorting logic
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortBy === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    if (sortBy === "amount") {
      const amountA = Number.parseFloat(a.fromAmount.replace(/,/g, ""))
      const amountB = Number.parseFloat(b.fromAmount.replace(/,/g, ""))
      return sortOrder === "asc" ? amountA - amountB : amountB - amountA
    }
    return 0
  })

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      case "complete":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={() => handleSort("amount")}>
                Amount
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Bank Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <div className="flex items-center cursor-pointer" onClick={() => handleSort("createdAt")}>
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No transactions found.
              </TableCell>
            </TableRow>
          ) : (
            sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {transaction.id.length > 8 ? `${transaction.id.substring(0, 8)}...` : transaction.id}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.userName || transaction.accountName}</div>
                  <div className="text-sm text-muted-foreground">{transaction.userId}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {transaction.fromAmount} {transaction.fromCurrency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ≈ {transaction.toAmount} {transaction.toCurrency}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.bankName}</div>
                  <div className="text-sm text-muted-foreground">{transaction.accountNumber}</div>
                  <div className="text-xs text-muted-foreground">{transaction.accountName}</div>
                </TableCell>
                <TableCell>
                  <div
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(transaction.status)}`}
                  >
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(transaction.createdAt), "h:mm a")}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTransaction(transaction.id)}>
                        View details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 
