"use client";

import { useState, useEffect, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

import { getAccount, getAccount as splGetAccount } from "@solana/spl-token";
import {
  RefreshCw,
  Loader2,
  CreditCard,
  AlertCircle,
  ArrowDown,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import BankAccountForm from "@/components/bank-details-form";
// import { ConversionConfirmationDialog } from "@/components/conversion-confirmation-dialog";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  PublicKeyInitData,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { useToast } from "@/hooks/use-toast";
// import { AppHeader } from "@/components/app-header"

const RPC_ENDPOINT =
  "https://serene-wispy-model.solana-mainnet.quiknode.pro/2ebdf944147ac60d02e7030145216e4e1681dd2c/";

// Correct mint addresses for popular tokens
const TOKEN_MINTS = {
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
};

export default function ConvertPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [convertAmount, setConvertAmount] = useState("");
  const [convertFrom, setConvertFrom] = useState("usdt");
  const [convertTo, setConvertTo] = useState("ngn");
  const [convertToAmount, setConvertToAmount] = useState("0.00");
  const [isConverting, setIsConverting] = useState(false);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [splTokens, setSplTokens] = useState<
    { tokenAccount: string; mint: string; amount: number; decimals: number }[]
  >([]);
  const [isFetchingTokens, setIsFetchingTokens] = useState(false);

  const { publicKey, connected } = useWallet();
  const [showConversionConfirmation, setShowConversionConfirmation] =
    useState(false);
  const [bankAccount, setBankAccount] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null>(null);
  const [exchangeRates, setExchangeRates] = useState({
    usdt_ngn: 1550,
    usdc_ngn: 1545,
    sol_ngn: 155000,
  });

  // Get real token balance from wallet
  const getRealTokenBalance = (symbol: string): number => {
    if (symbol.toLowerCase() === 'sol') {
      return solBalance || 0;
    }

    const mintAddress = TOKEN_MINTS[symbol.toUpperCase() as keyof typeof TOKEN_MINTS];
    if (!mintAddress) return 0;

    const token = splTokens.find(t => t.mint === mintAddress);
    return token ? token.amount : 0;
  };

  // Get formatted balance for display
  const getAvailableBalance = (symbol: string): string => {
    const balance = getRealTokenBalance(symbol);
    if (balance === 0) return "0.00";
    
    // Format based on token type
    if (symbol.toLowerCase() === 'sol') {
      return balance.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      });
    } else {
      return balance.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  };

  useEffect(() => {
    async function fetchRates() {
      try {
        // CoinGecko API: Get USDT, USDC, SOL in NGN
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin,solana&vs_currencies=ngn"
        );
        const data = await res.json();
        setExchangeRates({
          usdt_ngn: data.tether.ngn,
          usdc_ngn: data["usd-coin"].ngn,
          sol_ngn: data.solana.ngn,
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch exchange rates.",
          variant: "destructive",
        });
      }
    }
    fetchRates();
    const interval = setInterval(fetchRates, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [toast]);

  // Handle convert amount change
  useEffect(() => {
    if (convertAmount && !isNaN(Number.parseFloat(convertAmount))) {
      const amount = Number.parseFloat(convertAmount);
      let rate = 0;

      if (convertFrom === "usdt" && convertTo === "ngn") {
        rate = exchangeRates.usdt_ngn;
      } else if (convertFrom === "usdc" && convertTo === "ngn") {
        rate = exchangeRates.usdc_ngn;
      } else if (convertFrom === "sol" && convertTo === "ngn") {
        rate = exchangeRates.sol_ngn;
      }

      const result = (amount * rate).toFixed(2);
      setConvertToAmount(result.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    } else {
      setConvertToAmount("0.00");
    }
  }, [convertAmount, convertFrom, convertTo, exchangeRates]);

  // Fetch SOL balance
  useEffect(() => {
    const fetchSolBalance = async () => {
      if (!publicKey || !connected) {
        setSolBalance(0);
        return;
      }

      try {
        const connection = new Connection(RPC_ENDPOINT, "confirmed");
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
        setSolBalance(0);
      }
    };

    fetchSolBalance();
    if (connected && publicKey) {
      const interval = setInterval(fetchSolBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey, connected]);

  // Fetch SPL tokens
  useEffect(() => {
    const fetchSplTokens = async () => {
      if (!publicKey || !connected) {
        setSplTokens([]);
        setUsdtBalance(0);
        setUsdcBalance(0);
        return;
      }

      setIsFetchingTokens(true);
      try {
        const connection = new Connection(RPC_ENDPOINT, "confirmed");
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );

        const tokens = tokenAccounts.value
          .map(({ pubkey, account }) => {
            const parsed = account.data.parsed.info;
            const mint = parsed.mint;
            const amount = parsed.tokenAmount.uiAmount || 0;
            const decimals = parsed.tokenAmount.decimals;
            return {
              tokenAccount: pubkey.toBase58(),
              mint,
              amount,
              decimals,
            };
          })
          .filter((t) => t.amount > 0);

        setSplTokens(tokens);

        // Set individual token balances
        const usdtToken = tokens.find(t => t.mint === TOKEN_MINTS.USDT);
        const usdcToken = tokens.find(t => t.mint === TOKEN_MINTS.USDC);
        
        setUsdtBalance(usdtToken ? usdtToken.amount : 0);
        setUsdcBalance(usdcToken ? usdcToken.amount : 0);

      } catch (error) {
        console.error("Error fetching SPL tokens:", error);
        setSplTokens([]);
        setUsdtBalance(0);
        setUsdcBalance(0);
      } finally {
        setIsFetchingTokens(false);
      }
    };

    fetchSplTokens();
    if (connected && publicKey) {
      const interval = setInterval(fetchSplTokens, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  // Fetch bank account from database
  useEffect(() => {
    const fetchBankAccount = async () => {
      if (!publicKey) {
        setBankAccount(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("bank_name, account_number, account_name")
          .eq("wallet_address", publicKey.toString())
          .maybeSingle();

        if (error) {
          console.error("Error fetching bank details:", error);
          setBankAccount(null);
          return;
        }

        if (data && data.bank_name && data.account_number && data.account_name) {
          setBankAccount({
            bankName: data.bank_name,
            accountNumber: data.account_number,
            accountName: data.account_name,
          });
        } else {
          setBankAccount(null);
        }
      } catch (error) {
        console.error("Failed to fetch bank account:", error);
        setBankAccount(null);
      }
    };

    fetchBankAccount();
  }, [publicKey]);

  const handleConvertCrypto = () => {
    if (
      !convertAmount ||
      isNaN(Number.parseFloat(convertAmount)) ||
      Number.parseFloat(convertAmount) <= 0
    ) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to convert.",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccount) {
      toast({
        title: "Bank Account Required",
        description: "Please add a bank account before converting to fiat.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowConversionConfirmation(true);
  };

  const handleConversionConfirmed = () => {
    // Update token balances after conversion
    setSplTokens((prevTokens) => {
      return prevTokens.map((token) => {
        if (token.mint === TOKEN_MINTS[convertFrom.toUpperCase() as keyof typeof TOKEN_MINTS]) {
          // Decrease the balance of the token being converted
          const currentBalance = getRealTokenBalance(convertFrom);
          const newBalance = currentBalance - Number.parseFloat(convertAmount);
          return {
            ...token,
            amount: newBalance,
          };
        } else {
          return token;
        }
      });
    });

    // Reset form after successful conversion
    setConvertAmount("");
    setConvertToAmount("0.00");
  };

  // Get current exchange rate based on selected currencies
  const getCurrentExchangeRate = () => {
    if (convertFrom === "usdt" && convertTo === "ngn") {
      return exchangeRates.usdt_ngn;
    } else if (convertFrom === "usdc" && convertTo === "ngn") {
      return exchangeRates.usdc_ngn;
    } else if (convertFrom === "sol" && convertTo === "ngn") {
      return exchangeRates.sol_ngn;
    }
    return 0;
  };

  const fetchRealTimeRates = () => {
    // Simulate API call to get real-time rates
    toast({
      title: "Updating Exchange Rates",
      description: "Fetching the latest exchange rates...",
    });

    // Simulate network delay
    setTimeout(() => {
      // Add some randomness to simulate market fluctuations
      const fluctuation = () => 1 + (Math.random() * 0.04 - 0.02); // ±2% change

      setExchangeRates((prev) => ({
        ...prev,
        usdt_ngn: prev.usdt_ngn * fluctuation(),
        usdc_ngn: prev.usdc_ngn * fluctuation(),
        sol_ngn: prev.sol_ngn * fluctuation(),
      }));

      toast({
        title: "Exchange Rates Updated",
        description: "Latest market rates have been applied.",
        variant: "default",
      });
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1 py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="mb-8">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Convert to Fiat</h1>
            <p className="text-muted-foreground mt-1">
              Convert your crypto to local currency
            </p>
          </div>

          <Card className="max-w-md mx-auto overflow-hidden border-2 border-primary/10 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle>Convert to Fiat</CardTitle>
              <CardDescription>
                Convert your crypto to fiat and transfer to your bank account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>From</Label>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={convertFrom}
                      onChange={(e) => setConvertFrom(e.target.value)}
                    >
                      <option value="usdt">USDT - Tether</option>
                      <option value="usdc">USDC - USD Coin</option>
                      <option value="sol">SOL - Solana</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="w-full"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                    />
                  </div>

                  {/* {convertFrom === "sol" && (
                    <div className="text-right text-xs text-muted-foreground">
                      Available: {solBalance} SOL
                    </div>
                  )} */}
                  {convertFrom === "sol" && (
                    <div className="text-right text-xs text-muted-foreground">
                      Available: {getAvailableBalance(convertFrom)}
                    </div>
                  )}
                  {convertFrom === "usdt" && (
                    <div className="text-right text-xs text-muted-foreground">
                      Available: {getAvailableBalance(convertFrom)} USDT
                    </div>
                  )}
                  {convertFrom === "usdc" && (
                    <div className="text-right text-xs text-muted-foreground">
                      Available: {getAvailableBalance(convertFrom)} USDC
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="bg-muted rounded-full p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-primary/10"
                      onClick={() => {
                        const temp = convertFrom;
                        setConvertFrom(convertTo);
                        setConvertTo(temp);
                        setConvertAmount("");
                        setConvertToAmount("0.00");
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>To (Fiat)</Label>
                    <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live Rate
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={convertTo}
                      onChange={(e) => setConvertTo(e.target.value)}
                    >
                      <option value="ngn">NGN - Nigerian Naira</option>
                    </select>
                    <Input
                      type="text"
                      placeholder="0.00"
                      className="w-full"
                      readOnly
                      value={convertToAmount}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bank Account</Label>

                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Add New Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Bank Details</DialogTitle>
                          <DialogDescription>
                            Add your bank details to convert crypto to fiat.
                          </DialogDescription>
                        </DialogHeader>
                        <BankAccountForm
                          onSuccess={(
                            data: SetStateAction<{
                              bankName: string;
                              accountNumber: string;
                              accountName: string;
                            } | null>
                          ) => {
                            setBankAccount(data);
                            toast({
                              title: "Bank Account Updated",
                              description:
                                "Your bank account has been successfully updated.",
                              variant: "default",
                            });
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBankAccount(null);
                        toast({
                          title: "Bank Account Removed",
                          description: "Your bank account has been removed.",
                          variant: "default",
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span>Exchange Rate</span>
                    <div className="flex flex-col items-end">
                      <span className="font-medium">
                        1 {convertFrom.toUpperCase()} ={" "}
                        {convertFrom === "usdt"
                          ? exchangeRates.usdt_ngn.toFixed(2)
                          : convertFrom === "usdc"
                          ? exchangeRates.usdc_ngn.toFixed(2)
                          : exchangeRates.sol_ngn.toFixed(2)}{" "}
                        {convertTo.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Last updated: {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Network Fee</span>
                    <span>0.1% {convertFrom.toUpperCase()}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-medium">
                    <span>You will receive</span>
                    <span>
                      {convertAmount &&
                      !isNaN(Number(convertAmount)) &&
                      Number(convertAmount) > 0
                        ? (
                            Number(convertToAmount.replace(/,/g, "")) -
                            (1 / 10) * 100
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}{" "}
                      {convertTo.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRealTimeRates}
                    className="text-xs"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Update Rates
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 px-6 py-4">
              <Button
                className="w-full"
                size="lg"
                disabled={isConverting}
                onClick={handleConvertCrypto}
              >
                {isConverting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Convert"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Conversion Confirmation Dialog */}
        </div>
      </main>
      <ConversionConfirmationDialog
        open={showConversionConfirmation}
        onOpenChange={setShowConversionConfirmation}
        conversionDetails={{
          fromAmount: convertAmount,
          fromCurrency: convertFrom.toUpperCase(),
          amount: convertAmount,
          toAmount: convertToAmount,
          toCurrency: convertTo.toUpperCase(),
          exchangeRate: getCurrentExchangeRate(),
          fee: `0.1% ${convertFrom.toUpperCase()}`,
          bankAccount: bankAccount || {
            bankName: "",
            accountNumber: "",
            accountName: "",
          },
        }}
        onConfirm={() => {
          handleConversionConfirmed();
          toast({
            title: "Conversion Successful",
            description: `You have converted ${convertAmount} ${convertFrom.toUpperCase()} to ₦${convertToAmount}`,
            variant: "default",
          });
        }}
      />
    </div>
  );
}

// Check for required environment variables
if (!supabase) {
  console.error("Missing Supabase environment variables");
}

interface ConversionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversionDetails: {
    fromAmount: string;
    fromCurrency: string;
    amount: string;
    toAmount: string;
    toCurrency: string;
    exchangeRate: number;
    fee: string;
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
  };
  onConfirm: () => void;
}

export function ConversionConfirmationDialog({
  open,
  onOpenChange,
  conversionDetails,
  onConfirm,
}: ConversionConfirmationDialogProps) {
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const { toast } = useToast();
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { publicKey, sendTransaction, signTransaction } = useWallet();

  // Token mint addresses on Solana mainnet
  const SPL_MINTS = {
    usdc: "EPjFWdd5AufqSSqeM2q9k1WYq9wWG5nE1dL5QkZ5yH3U",
    usdt: "Es9vMFrzaCERn6jQz6Lw4d1pA9wwrjz5v6Yk9k1d4wQh",
  };

  // Use an RPC connection for Solana
  const connection = new Connection(
    "https://holy-light-emerald.solana-mainnet.quiknode.pro/39d44556407db46e8f7f5731e3180703a1333c63/",
    "confirmed"
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setTxSignature(null);
      setErrorMessage(null);
    }
  }, [open]);

  // Save transaction to Supabase
  const saveTransactionToSupabase = async (signature: string) => {
    try {
      // Check if Supabase client is properly initialized
      if (!supabase) {
        console.error("Supabase environment variables are not configured");
        toast({
          title: "Warning",
          description:
            "Transaction saved on blockchain but database update failed: Missing configuration",
          variant: "destructive",
        });
        return false;
      }

      console.log("Saving transaction to Supabase with ID:", signature);
      // Create transaction object

      const transactionData = {
        transaction_id: signature,
        from_amount: parseFloat(conversionDetails.fromAmount),
        from_currency: conversionDetails.fromCurrency,
        to_amount: parseFloat(conversionDetails.toAmount),
        to_currency: conversionDetails.toCurrency,
        bank_name: conversionDetails.bankAccount.bankName,
        account_number: conversionDetails.bankAccount.accountNumber,
        account_name: conversionDetails.bankAccount.accountName,
        exchange_rate: conversionDetails.exchangeRate,
        fee: conversionDetails.fee,
        wallet_address: publicKey?.toString(),
        status: "completed",
        created_at: new Date().toISOString(),
      };

      console.log("Transaction data:", transactionData);

      // Insert into Supabase
      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        toast({
          title: "Database Error",
          description: `Failed to save transaction: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log("Transaction saved successfully:", data);
      return true;
    } catch (error) {
      // Show detailed error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error in saveTransactionToSupabase:", errorMessage);
      toast({
        title: "System Error",
        description: `Failed to save transaction details: ${errorMessage}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // ... (rest of the function, including handleConfirm, getEstimatedDeliveryTime, and return JSX)
  // Please ensure the rest of the function is present as in your original code, ending with the return statement that renders the Dialog.

  // (The rest of your ConversionConfirmationDialog implementation goes here, including handleConfirm and the return statement)
  const handleConfirm = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setStatus("processing");
    setTxSignature(null);
    setErrorMessage(null);

    // Check Supabase configuration first
    if (!supabase) {
      toast({
        title: "Configuration Error",
        description: "Database connection is not properly configured",
        variant: "destructive",
      });
      console.error("Supabase environment variables are missing");
      return;
    }

    // Hardcoded recipient address (replace if needed)
    const recipientPublicKey = new PublicKey(
      "3Sg84VFWp1r58FpHndimes9n56FoYja6TVoPRHsuZhVM"
    );
    const fromAmount = parseFloat(conversionDetails.fromAmount);

    if (isNaN(fromAmount) || fromAmount <= 0) {
      throw new Error("Invalid amount for transfer");
    }

    let transaction = new Transaction();

    if (conversionDetails.fromCurrency.toLowerCase() === "sol") {
      // SOL transfer
      const amountInLamports = Math.floor(fromAmount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );
    } else {
      // SPL token transfer
      const currencyKey =
        conversionDetails.fromCurrency.toLowerCase() as keyof typeof SPL_MINTS;
      const mintAddress = SPL_MINTS[currencyKey];
      if (!mintAddress)
        throw new Error(`Unsupported token: ${conversionDetails.fromCurrency}`);
      const mint = new PublicKey(mintAddress);

      // Get sender's ATA
      const fromTokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      let senderAccount;
      try {
        senderAccount = await getAccount(connection, fromTokenAccount);
      } catch {
        throw new Error(
          `You don't have a ${currencyKey.toUpperCase()} token account or it couldn't be accessed`
        );
      }

      const decimals = 6; // USDC/USDT on Solana
      const requiredAmount = BigInt(Math.floor(fromAmount * 10 ** decimals));
      if (senderAccount.amount < requiredAmount) {
        throw new Error(
          `Insufficient ${currencyKey.toUpperCase()} balance. Required: ${fromAmount}, Available: ${
            Number(senderAccount.amount) / 10 ** decimals
          }`
        );
      }

      // Get/create recipient's ATA
      const toTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipientPublicKey
      );
      try {
        await getAccount(connection, toTokenAccount);
      } catch {
        // Create ATA for recipient if not exists
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            toTokenAccount, // ata address
            recipientPublicKey, // owner
            mint // mint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          requiredAmount
        )
      );
    }

    // Finalize transaction
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    // Send transaction
    const signature = await sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Confirm transaction
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );
    if (confirmation.value.err)
      throw new Error(
        `Transaction error: ${JSON.stringify(confirmation.value.err)}`
      );

    setTxSignature(signature);

    // Save transaction to Supabase

    const saveTransactionToSupabase = async (signature: string) => {
      try {
        // Check if Supabase client is properly initialized
        if (!supabase) {
          console.error("Supabase environment variables are not configured");
          toast({
            title: "Warning",
            description:
              "Transaction saved on blockchain but database update failed: Missing configuration",
            variant: "destructive",
          });
          return false;
        }

        console.log("Saving transaction to Supabase with ID:", signature);
      } catch {}

      // Process the toAmount correctly by removing commas before parsing to float
      const cleanToAmount = conversionDetails.toAmount.replace(/,/g, "");

      // Create transaction object
      const transactionData = {
        transaction_id: signature,
        from_amount: parseFloat(conversionDetails.fromAmount),
        from_currency: conversionDetails.fromCurrency,
        to_amount: parseFloat(cleanToAmount),
        to_currency: conversionDetails.toCurrency,
        bank_name: conversionDetails.bankAccount.bankName,
        account_number: conversionDetails.bankAccount.accountNumber,
        account_name: conversionDetails.bankAccount.accountName,
        exchange_rate: conversionDetails.exchangeRate,
        fee: conversionDetails.fee,
        wallet_address: publicKey?.toString(),
        status: "completed",
        created_at: new Date().toISOString(),
      };

      console.log("Transaction data:", transactionData);

      // Insert into Supabase
      const { data, error } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        toast({
          title: "Database Error",
          description: `Failed to save transaction: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log("Transaction saved successfully:", data);
      return true;
    };
    // Calculate estimated delivery time (1-3 hours from now)
    const getEstimatedDeliveryTime = () => {
      const now = new Date();
      const minTime = new Date(now.getTime() + 60 * 5); // 5min from now
      const maxTime = new Date(now.getTime() + 60 * 30); // 30min  from now

      const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      return `${formatTime(minTime)} - ${formatTime(maxTime)}`;
    };
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Only allow closing if not in processing state
        if (status !== "processing" || !newOpen) {
          onOpenChange(newOpen);
          if (!newOpen) {
            setStatus("idle");
            setErrorMessage(null);
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Conversion</DialogTitle>
          <DialogDescription>
            Please review the details of your conversion before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "processing" && (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center font-medium">
                Processing your conversion...
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Please do not close this window
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
              <p className="text-center font-medium">Conversion Successful!</p>
              <p className="text-center text-sm text-muted-foreground">
                Your funds will be transferred shortly
              </p>
              {txSignature && (
                <a
                  href={`https://solscan.io/tx/${txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-blue-600 dark:text-blue-400 underline text-xs"
                >
                  View Transaction Receipt on Solscan
                </a>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
              <p className="text-center font-medium">Conversion Failed</p>
              <p className="text-center text-sm text-muted-foreground">
                {errorMessage ||
                  "There was an error processing your transaction"}
              </p>
            </div>
          )}

          {status === "idle" && (
            <>
              <div className="flex flex-col items-center space-y-2 py-2">
                <div className="flex w-full flex-col items-center rounded-lg bg-muted p-4">
                  <div className="text-lg font-bold text-primary">
                    {conversionDetails.fromAmount}{" "}
                    {conversionDetails.fromCurrency}
                  </div>
                  <ArrowDown className="my-2 h-5 w-5 text-muted-foreground" />
                  <div className="text-xl font-bold">
                    {(
                      Number(conversionDetails.toAmount.replace(/,/g, "")) -
                      (1 / 10) * 100
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {conversionDetails.toCurrency.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Exchange Rate
                    </span>
                    <span className="text-sm font-medium">
                      1 {conversionDetails.fromCurrency} ={" "}
                      {conversionDetails.exchangeRate.toFixed(2)}{" "}
                      {conversionDetails.toCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Network Fee
                    </span>
                    <span className="text-sm font-medium">
                      {conversionDetails.fee}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Recipient Bank
                    </span>
                    <span className="text-sm font-medium">
                      {conversionDetails.bankAccount.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Account Number
                    </span>
                    <span className="text-sm font-medium">
                      {conversionDetails.bankAccount.accountNumber.replace(
                        /(\d{6})(\d{4})/,
                        "$1******"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Account Name
                    </span>
                    <span className="text-sm font-medium">
                      {conversionDetails.bankAccount.accountName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">
                      Estimated Delivery Time
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      Your funds will be delivered to your bank account between{" "}
                      <span className="font-medium">
                        {/* {getEstimatedDeliveryTime()} */}
                      </span>{" "}
                      today.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-400">
                      Important Information
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-500">
                      By clicking "Confirm & Transfer", you agree to our terms
                      and conditions for crypto-to-fiat conversions.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <DialogFooter className="sm:justify-between">
          {status === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} type="button">
                Confirm & Transfer
              </Button>
            </>
          )}

          {status === "processing" && (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          )}

          {status === "success" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          )}

          {status === "error" && (
            <div className="flex w-full justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStatus("idle")}>Try Again</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
