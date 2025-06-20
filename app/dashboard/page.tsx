"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Line } from "react-chartjs-2";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
Chart.register(LineElement, PointElement, LinearScale, CategoryScale);

import { redirect, useRouter, usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CreditCard,
  ExternalLink,
  History,
  LogOut,
  RefreshCw,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { clusterApiUrl } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BankAccountForm from "@/components/bank-details-form";
import { TokenCard } from "@/components/token-card";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWallet } from "@solana/wallet-adapter-react";
import { truncateAddress } from "@/lib/utils"; // TODO: Fix missing module
import AppHeader from "@/components/app-header";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import React from "react";
import { useAuth } from "@/context/auth-context";
import { getConnection } from "@/lib/jupiter";
import { cn } from "@/lib/utils";
import BankDetailsForm from "@/components/bank-details-form";
import { ToastContainer } from "react-toastify";
import { supabase } from "@/lib/supabase/client";

const TOKEN_LIST_URL =
  "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json";

const RPC_ENDPOINT =
  "https://serene-wispy-model.solana-mainnet.quiknode.pro/2ebdf944147ac60d02e7030145216e4e1681dd2c/";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const [showPinSetup, setShowPinSetup] = useState(true);
  const [showConversionConfirmation, setShowConversionConfirmation] =
    useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [totalBalance, setTotalBalance] = useState("$2,724.75");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceChange, setBalanceChange] = useState("+2.8%");
  const [splTokens, setSplTokens] = useState<
    { tokenAccount: string; mint: string; amount: number; decimals: number }[]
  >([]);
  const [isFetchingSplTokens, setIsFetchingSplTokens] = useState(false);
  const [tokenMap, setTokenMap] = useState<
    Record<string, { logoURI?: string; symbol?: string; name?: string }>
  >({});

  const [walletConnected, setWalletConnected] = useState(true);
  const [bankAccount, setBankAccount] = useState({
    bankName: "Bank Name ",
    accountNumber: "  ",
    accountName: " ",
  });
  const [swapAmount, setSwapAmount] = useState("");
  const [swapFrom, setSwapFrom] = useState("bonk");
  const [swapTo, setSwapTo] = useState("usdc");
  const [swapToAmount, setSwapToAmount] = useState("0.00");
  const [convertAmount, setConvertAmount] = useState("");
  const [convertFrom, setConvertFrom] = useState("usdt");
  const [convertTo, setConvertTo] = useState("ngn");
  const [convertToAmount, setConvertToAmount] = useState("0.00");
  const [exchangeRates, setExchangeRates] = useState({
    bonk_usdc: 0.00001,
    sol_usdc: 100,
    usdt_ngn: 1550,
    usdc_ngn: 1545,
    sol_ngn: 155000,
  });
  const [nairaRates, setNairaRates] = useState({
    usdt_ngn: [],
    usdc_ngn: [],
    sol_ngn: [],
  });
  const [rateTrends, setRateTrends] = useState<{
    usdt_ngn: number[];
    usdc_ngn: number[];
    sol_ngn: number[];
  }>({
    usdt_ngn: [],
    usdc_ngn: [],
    sol_ngn: [],
  });
  const [rateIncrements, setRateIncrements] = useState<{
    usdt_ngn: number;
    usdc_ngn: number;
    sol_ngn: number;
  }>({
    usdt_ngn: 0,
    usdc_ngn: 0,
    sol_ngn: 0,
  });

  const { toast } = useToast();
  const [isSwapping, setIsSwapping] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const { setVisible } = useWalletModal();
  const { autoConnect, wallet, connect, disconnect } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Mock data for tokens
  const [tokens, setTokens] = useState([
    {
      name: "USDT",
      symbol: "USDT",
      balance: "1,250.00",
      value: "$1,250.00",
      change: "+2.5%",
    },
    {
      name: "USDC",
      symbol: "USDC",
      balance: "750.50",
      value: "$750.50",
      change: "+1.2%",
    },
    {
      name: "Solana",
      symbol: "SOL",
      balance: "5.75",
      value: "$574.25",
      change: "+4.8%",
    },
    {
      name: "Bonk",
      symbol: "BONK",
      balance: "1,500,000",
      value: "$150.00",
      change: "-3.2%",
    },
    {
      name: "Raydium",
      symbol: "RAY",
      balance: "100.00",
      value: "$75.00",
      change: "+1.5%",
    },
    {
      name: "Serum",
      symbol: "SRM",
      balance: "200.00",
      value: "$60.00",
      change: "-0.8%",
    },
    {
      name: "Mango",
      symbol: "MNGO",
      balance: "1,000.00",
      value: "$50.00",
      change: "+3.2%",
    },
    {
      name: "Step Finance",
      symbol: "STEP",
      balance: "500.00",
      value: "$25.00",
      change: "+0.5%",
    },
  ]);

  const navItems = [
    { name: "Overview", path: "/dashboard" },
    { name: "Swap", path: "/swap" },
    { name: "Convert", path: "/convert" },
    // { name: "History", path: "/history" },
  ];

  // Only check for wallet connection
  useEffect(() => {
    if (!connected || !publicKey) {
      router.push("/login");
    }
  }, [connected, publicKey, router]);


const saveBankAccountToDbAlternative = async (data: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}) => {
  if (!publicKey) {
    return { error: "No wallet connected" };
  }

  const walletAddress = publicKey.toString();

  try {
    // Try to insert first (for new users)
    const { data: insertData, error: insertError } = await supabase
      .from("profiles")
      .insert({
        wallet_address: walletAddress,
        bank_name: data.bankName,
        account_number: data.accountNumber,
        account_name: data.accountName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (insertError) {
      // If insert fails due to duplicate wallet_address, try update
      if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({
            bank_name: data.bankName,
            account_number: data.accountNumber,
            account_name: data.accountName,
            updated_at: new Date().toISOString(),
          })
          .eq("wallet_address", walletAddress)
          .select();

        if (updateError) {
          console.error("Update error:", updateError);
          return { error: `Failed to update bank details: ${updateError.message}` };
        }

        return { error: null, data: updateData };
      } else {
        console.error("Insert error:", insertError);
        return { error: `Failed to save bank details: ${insertError.message}` };
      }
    }

    return { error: null, data: insertData };
  } catch (error) {
    console.error("Database operation failed:", error);
    return { error: `Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Fixed removeBankAccountFromDb function
const removeBankAccountFromDb = async () => {
  if (!publicKey) {
    return { error: "No wallet connected" };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        bank_name: null,
        account_number: null,
        account_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", publicKey.toString());

    if (error) {
      console.error("Remove error:", error);
      return { error: `Failed to remove bank details: ${error.message}` };
    }

    return { error: null };
  } catch (error) {
    console.error("Failed to remove bank details:", error);
    return { error: `Failed to remove bank details: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Fixed fetchBankAccount function - This should not cause errors for new users
useEffect(() => {
  const fetchBankAccount = async () => {
    if (!publicKey) {
      setBankAccount({
        bankName: "",
        accountNumber: "",
        accountName: "",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bank_name, account_number, account_name")
        .eq("wallet_address", publicKey.toString())
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record exists

      // maybeSingle() returns null when no record exists, without throwing an error
      if (error) {
        console.error("Error fetching bank details:", error);
        setBankAccount({
          bankName: "",
          accountNumber: "",
          accountName: "",
        });
        return;
      }

      if (data) {
        setBankAccount({
          bankName: data.bank_name || "",
          accountNumber: data.account_number || "",
          accountName: data.account_name || "",
        });
      } else {
        // No record exists - set empty values
        setBankAccount({
          bankName: "",
          accountNumber: "",
          accountName: "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch bank account:", error);
      setBankAccount({
        bankName: "",
        accountNumber: "",
        accountName: "",
      });
    }
  };

  fetchBankAccount();
}, [publicKey]);

// Fixed UI handlers with better error handling
const handleSaveBankAccount = async (data: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}) => {
  try {
    const result = await saveBankAccountToDbAlternative(data);
    
    if (result.error) {
      console.error("Save error:", result.error);
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setBankAccount(data);
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been successfully added.",
        variant: "default",
      });
      // Close the dialog if you have access to setOpen function
      // setOpen(false);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    toast({
      title: "Error",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  }
};

const handleRemoveBankAccount = async () => {
  try {
    const result = await removeBankAccountFromDb();
    
    if (result.error) {
      console.error("Remove error:", result.error);
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setBankAccount({
        bankName: "",
        accountNumber: "",
        accountName: "",
      });
      toast({
        title: "Bank Account Removed",
        description: "Your bank account has been removed.",
        variant: "default",
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    toast({
      title: "Error",
      description: "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  }
};

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTokens((prevTokens) => {
        return prevTokens.map((token) => ({
          ...token,
          change: `${Math.random() > 0.5 ? "+" : "-"}${(
            Math.random() * 5
          ).toFixed(1)}%`,
        }));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Add this useEffect for automatic rate updates
  useEffect(() => {
    // Update rates every 60 seconds
    const rateInterval = setInterval(() => {
      // Add some randomness to simulate market fluctuations
      const fluctuation = () => 1 + (Math.random() * 0.02 - 0.01); // ±1% change

      setExchangeRates((prev) => ({
        ...prev,
        usdt_ngn: prev.usdt_ngn * fluctuation(),
        usdc_ngn: prev.usdc_ngn * fluctuation(),
        sol_ngn: prev.sol_ngn * fluctuation(),
      }));
    }, 60000);

    return () => clearInterval(rateInterval);
  }, []);
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch USD/NGN, USDT/USD, USDC/USD, SOL/USD from CoinGecko
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=usd,usd-coin,tether,solana&vs_currencies=ngn,usd"
        );
        const data = await res.json();

        const usd_ngn = data.usd.ngn;
        const sol_usd = data.solana.usd;
        const usdt_usd = data.tether.usd;
        const usdc_usd = data["usd-coin"].usd;

        // Calculate rates
        const usdt_ngn = usd_ngn * usdt_usd; // USDT/NGN
        const usdc_ngn = usd_ngn * usdc_usd; // USDC/NGN
        const sol_ngn = sol_usd * usd_ngn; // SOL/NGN

        // Update rolling trend history (last 20 points)
        setRateTrends((prev) => ({
          usdt_ngn: [...prev.usdt_ngn.slice(-19), usdt_ngn],
          usdc_ngn: [...prev.usdc_ngn.slice(-19), usdc_ngn],
          sol_ngn: [...prev.sol_ngn.slice(-19), sol_ngn],
        }));

        // Calculate increment rates
        setRateIncrements((prev) => ({
          usdt_ngn:
            prev.usdt_ngn > 0
              ? ((usdt_ngn - prev.usdt_ngn) / prev.usdt_ngn) * 100
              : 0,
          usdc_ngn:
            prev.usdc_ngn > 0
              ? ((usdc_ngn - prev.usdc_ngn) / prev.usdc_ngn) * 100
              : 0,
          sol_ngn:
            prev.sol_ngn > 0
              ? ((sol_ngn - prev.sol_ngn) / prev.sol_ngn) * 100
              : 0,
        }));

        // Update latest rates
        setExchangeRates((prev) => ({
          ...prev,
          usdt_ngn,
          usdc_ngn,
          sol_ngn,
        }));
      } catch (err) {
        console.error("Failed to fetch FX rates", err);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 15000); // update every 15s
    return () => clearInterval(interval);
  }, []);

  //live trend
  const TrendChart = ({
    data,
    color = "#22c55e",
  }: {
    data: number[];
    color?: string;
  }) => (
    <div style={{ width: "100%", height: 50 }}>
      <Line
        data={{
          labels: data.map((_, i) => i + 1),
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor: "rgba(34,197,94,0.1)",
              tension: 0.4,
              pointRadius: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false },
          },
        }}
        height={50}
      />
    </div>
  );

  // Handle swap amount change
  useEffect(() => {
    if (swapAmount && !isNaN(Number.parseFloat(swapAmount))) {
      const amount = Number.parseFloat(swapAmount);
      let rate = 0;

      if (swapFrom === "bonk" && swapTo === "usdc") {
        rate = exchangeRates.bonk_usdc;
      } else if (swapFrom === "sol" && swapTo === "usdc") {
        rate = exchangeRates.sol_usdc;
      }

      const result = (amount * rate).toFixed(2);
      setSwapToAmount(result);
    } else {
      setSwapToAmount("0.00");
    }
  }, [swapAmount, swapFrom, swapTo, exchangeRates]);

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

  const handleConnectWallet = async () => {
    try {
      if (!connected) {
        await setVisible(true);
      } else {
        await disconnect();
        await setVisible(true);
      }

      setWalletConnected(true);
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
        variant: "default",
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Wallet Connect Error",
        description: "Your wallet failed to connect",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
      variant: "default",
    });
  };

  // Get SOL balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;

      try {
        setIsLoading(true);
        const connection = new Connection(RPC_ENDPOINT, "confirmed");
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast({
          title: "Error",
          description: "Failed to fetch wallet balance. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (connected) {
      fetchBalance();
      // Set up a refresh interval (every 10 seconds)
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    } else {
      setSolBalance(null);
    }
  }, [publicKey, connected, toast]);
  //spl-tokens
  useEffect(() => {
    fetch(TOKEN_LIST_URL)
      .then((res) => res.json())
      .then((data) => {
        // Map mint address to token info for quick lookup
        const map: Record<string, (typeof data.tokens)[0]> = {};
        data.tokens.forEach((token: { address: string }) => {
          map[token.address] = token;
        });
        setTokenMap(map);
      });
  }, []);

  // Fetch SPL tokens
  useEffect(() => {
    const fetchSplTokens = async () => {
      if (!publicKey) {
        setSplTokens([]);
        return;
      }

      setIsFetchingSplTokens(true);
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
            const amount = parsed.tokenAmount.uiAmount;
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
      } catch (error) {
        console.error("Error fetching SPL tokens:", error);
        toast({
          title: "Error",
          description: "Failed to fetch SPL tokens. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsFetchingSplTokens(false);
      }
    };

    if (connected && publicKey) {
      fetchSplTokens();
      const interval = setInterval(fetchSplTokens, 30000);
      return () => clearInterval(interval);
    } else {
      setSplTokens([]);
    }
  }, [connected, publicKey, toast]);

  const handleSwapTokens = () => {
    if (
      !swapAmount ||
      isNaN(Number.parseFloat(swapAmount)) ||
      Number.parseFloat(swapAmount) <= 0
    ) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive",
      });
      return;
    }

    // Show loading state
    setIsSwapping(true);

    // Simulate API call with a slight delay to show loading state
    setTimeout(() => {
      // Update token balances after swap
      setTokens((prevTokens) => {
        return prevTokens.map((token) => {
          if (token.symbol.toLowerCase() === swapFrom.toUpperCase()) {
            // Decrease the balance of the token being swapped
            const currentBalance = Number.parseFloat(
              token.balance.replace(/,/g, "")
            );
            const newBalance = currentBalance - Number.parseFloat(swapAmount);
            return {
              ...token,
              balance: newBalance
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
              value: `$${(
                (newBalance *
                  Number.parseFloat(token.value.replace(/[$,]/g, ""))) /
                currentBalance
              )
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
            };
          } else if (token.symbol.toLowerCase() === swapTo.toUpperCase()) {
            // Increase the balance of the token being received
            const currentBalance = Number.parseFloat(
              token.balance.replace(/,/g, "")
            );
            const newBalance = currentBalance + Number.parseFloat(swapToAmount);
            return {
              ...token,
              balance: newBalance
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
              value: `$${(
                (newBalance *
                  Number.parseFloat(token.value.replace(/[$,]/g, ""))) /
                currentBalance
              )
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
            };
          }
          return token;
        });
      });

      // Show success toast with more details
      toast({
        title: "Swap Successful",
        description: `You have swapped ${swapAmount} ${swapFrom.toUpperCase()} for ${swapToAmount} ${swapTo.toUpperCase()}.`,
        variant: "default",
      });

      // Reset form
      setSwapAmount("");
      setSwapToAmount("0.00");
      setIsSwapping(false);
    }, 1500);
  };

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
    setTokens((prevTokens) => {
      return prevTokens.map((token) => {
        if (token.symbol.toLowerCase() === convertFrom.toUpperCase()) {
          // Decrease the balance of the token being converted
          const currentBalance = Number.parseFloat(
            token.balance.replace(/,/g, "")
          );
          const newBalance = currentBalance - Number.parseFloat(convertAmount);
          return {
            ...token,
            balance: newBalance
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            value: `$${(
              (newBalance *
                Number.parseFloat(token.value.replace(/[$,]/g, ""))) /
              currentBalance
            )
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
          };
        }
        return token;
      });
    });

    // Reset form after successful conversion
    setConvertAmount("");
    setConvertToAmount("0.00");
  };

  // Token mint addresses for popular tokens
  const TOKEN_MINTS = {
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  };

  // Get real token balance from SPL tokens
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
    return balance.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  // Get balance for specific token with proper formatting
  const getTokenBalanceForDisplay = (symbol: string): string => {
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

  // Calculate total portfolio value in USDT
  const calculateTotalPortfolioValueInUSDT = (): number => {
    let totalValue = 0;

    // Add SOL value (convert SOL to USDT)
    const solBalanceValue = solBalance || 0;
    if (solBalanceValue > 0 && exchangeRates.sol_ngn > 0 && exchangeRates.usdt_ngn > 0) {
      // Convert SOL -> NGN -> USDT
      const solToNgn = solBalanceValue * exchangeRates.sol_ngn;
      const solToUsdt = solToNgn / exchangeRates.usdt_ngn;
      totalValue += solToUsdt;
    }

    // Add USDT value (already in USDT)
    const usdtBalance = getRealTokenBalance('USDT');
    totalValue += usdtBalance;

    // Add USDC value (convert USDC to USDT - approximately 1:1)
    const usdcBalance = getRealTokenBalance('USDC');
    if (usdcBalance > 0 && exchangeRates.usdc_ngn > 0 && exchangeRates.usdt_ngn > 0) {
      // Convert USDC -> NGN -> USDT
      const usdcToNgn = usdcBalance * exchangeRates.usdc_ngn;
      const usdcToUsdt = usdcToNgn / exchangeRates.usdt_ngn;
      totalValue += usdcToUsdt;
    }

    return totalValue;
  };

  // Calculate portfolio balance change (mock data for now)
  const getPortfolioBalanceChange = (): string => {
    // This could be calculated by comparing current portfolio value with previous value
    // For now, using a mock positive change
    return "+2.4%";
  };

  // Get all tokens including SOL and SPL tokens for portfolio display
  const getAllTokensForPortfolio = () => {
    const allTokens = [];

    // Add SOL as the first token with proper logo from token list or fallback
    if (solBalance !== null) {
      // Try to get SOL metadata from tokenMap, fallback to local
      const solMeta = tokenMap['So11111111111111111111111111111111111111112'];
      allTokens.push({
        tokenAccount: 'native',
        mint: 'So11111111111111111111111111111111111111112',
        amount: solBalance,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana', 
        logoURI: solMeta?.logoURI || 
          'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      });
    }

    // Add SPL tokens with metadata from official token list
    splTokens.forEach(token => {
      // Get metadata from tokenMap (official Solana token list)
      const meta = tokenMap[token.mint];
      
      let symbol = 'UNKNOWN';
      let name = 'Unknown Token';
      let logoURI = null;

      if (meta) {
        symbol = meta.symbol || 'UNKNOWN';
        name = meta.name || 'Unknown Token';
        logoURI = meta.logoURI || null;
      } else {
        // Fallback for well-known tokens if not in tokenMap
        if (token.mint === TOKEN_MINTS.USDT) {
          symbol = 'USDT';
          name = 'Tether USD';
          logoURI = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg';
        } else if (token.mint === TOKEN_MINTS.USDC) {
          symbol = 'USDC';
          name = 'USD Coin';
          logoURI = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png';
        }
      }

      allTokens.push({
        ...token,
        symbol,
        name,
        logoURI
      });
    });

    return allTokens;
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

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been successfully disconnected.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleNavigateToSwap = () => {
    router.push("/swap");
  };
  const handleNavigateToConvert = () => {
    router.push("/convert");
  };
  // const handleNavigateToHistory = () => {
  //   router.push("/transaction");
  // };

  if (!connected || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* <AppHeader /> */}

      <main className="flex-1 py-8">
        <div className="container">
          {/* Navigation */}
          {/* <div className="mb-8">
            <nav className="flex items-center space-x-4 lg:space-x-6">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary hover:text-black",
                    pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                  onClick={() => router.push(item.path)}
                >
                  {item.name}
                </Button>
              ))}
            </nav>
          </div> */}
          <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleNavigateToSwap}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Swap Tokens
              </Button>
              <Button
                onClick={handleNavigateToConvert}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Convert Tokens
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Portfolio Balance Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Portfolio Balance</CardTitle>
                <CardDescription>
                  Your total portfolio value in USDT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">
                    {solBalance === null || isFetchingSplTokens ? (
                      <Loader2 className="inline w-4 h-4 animate-spin" />
                    ) : (
                      <span>
                        {calculateTotalPortfolioValueInUSDT().toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-lg text-muted-foreground">USDT</span>
                      </span>
                    )}
                  </div>
                  <div></div>

                  <div
                    className={`flex items-center text-sm ${
                      getPortfolioBalanceChange().startsWith("+")
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {getPortfolioBalanceChange()} (24h)
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Refreshing Portfolio",
                        description:
                          "Getting the latest portfolio balance...",
                      });
                      // Force refresh balances and exchange rates
                      if (connected && publicKey) {
                        // Refresh SOL balance
                        const connection = new Connection(RPC_ENDPOINT, "confirmed");
                        connection.getBalance(publicKey).then(balance => {
                          setSolBalance(balance / LAMPORTS_PER_SOL);
                        }).catch(console.error);
                        
                        // Refresh SPL tokens
                        setIsFetchingSplTokens(true);
                        connection.getParsedTokenAccountsByOwner(
                          publicKey,
                          { programId: TOKEN_PROGRAM_ID }
                        ).then(tokenAccounts => {
                          const tokens = tokenAccounts.value
                            .map(({ pubkey, account }) => {
                              const parsed = account.data.parsed.info;
                              return {
                                tokenAccount: pubkey.toBase58(),
                                mint: parsed.mint,
                                amount: parsed.tokenAmount.uiAmount || 0,
                                decimals: parsed.tokenAmount.decimals,
                              };
                            })
                            .filter((t) => t.amount > 0);
                          setSplTokens(tokens);
                        }).catch(console.error).finally(() => {
                          setIsFetchingSplTokens(false);
                        });
                      }
                    }}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Refresh
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    {/* <Link href="/transaction"> 
                      <History className="mr-2 h-3 w-3" />
                      View History
                    </Link>  */}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Connected Wallet</CardTitle>
                <CardDescription>Manage your connected wallet</CardDescription>
              </CardHeader>
              <CardContent>
                {connected ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary/20 p-2">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {truncateAddress(publicKey?.toString() || "")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Solana
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href="https://explorer.solana.com"
                          target="_blank"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="sr-only">View on Explorer</span>
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDisconnect}
                      >
                        Disconnect Wallet
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="text-center text-muted-foreground">
                      No wallet connected
                    </div>
                    <Button onClick={handleConnectWallet}>
                      Connect Wallet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Account Card */}
            <Card>
              <CardHeader className="pb-2 w-full sm:w-auto">
                <CardTitle>Bank Account</CardTitle>

                <CardDescription className="flex flex-row gap-1 justify-left">
                  {" "}
                  <CreditCard className="mr-2 h-4 w-4" /> link your bank account{" "}
                </CardDescription>
              </CardHeader>
              <CardContent>
              
                {bankAccount && bankAccount.accountNumber ? (
                  <>
                    <div className="rounded-md border p-3">
                      <div className="font-medium">{bankAccount.bankName}</div>
                      <div className="text-sm text-muted-foreground">
                        {bankAccount.accountName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bankAccount.accountNumber.replace(
                          /(\d{6})(\d{4})/,
                          "$1******"
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Add New Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Bank Account</DialogTitle>
                            <DialogDescription>
                              Update your bank account details
                            </DialogDescription>
                          </DialogHeader>
                          <BankAccountForm
                            onSuccess={async (data) => {
                              const { error } = await  saveBankAccountToDbAlternative(data);
                              if (error) {
                                console.error("Save error:", error);
                                toast({
                                  title: "Error",
                                  description:
                                    "Failed to save bank details. Please try again.",
                                  variant: "destructive",
                                });
                              } else {
                                setBankAccount(data);
                                toast({
                                  title: "Bank Account Added",
                                  description:
                                    "Your bank account has been successfully added.",
                                  variant: "default",
                                });
                              }
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { error } = await removeBankAccountFromDb();
                          if (error) {
                            console.error("Remove error:", error);
                            toast({
                              title: "Error",
                              description:
                                "Failed to remove bank details. Please try again.",
                              variant: "destructive",
                            });
                          } else {
                            setBankAccount({
                              bankName: "",
                              accountNumber: "",
                              accountName: "",
                            });
                            toast({
                              title: "Bank Account Removed",
                              description:
                                "Your bank account has been removed.",
                              variant: "default",
                            });
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="text-center text-muted-foreground">
                      No bank account linked
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Add Bank Account
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
                          onSuccess={async (data) => {
                            const { error } = await  saveBankAccountToDbAlternative(data);
                            if (error) {
                              console.error("Save error:", error);
                              toast({
                                title: "Error",
                                description:
                                  "Failed to save bank details. Please try again.",
                                variant: "destructive",
                              });
                            } else {
                              setBankAccount(data);
                              toast({
                                title: "Bank Account Added",
                                description:
                                  "Your bank account has been successfully added.",
                                variant: "default",
                              });
                            }
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 mb-4">
            <Card className="mb-6 ">
              <CardHeader>
                <CardTitle className="text-lg">Naira Exchange Rates</CardTitle>
                <CardDescription>
                  Live rates and trends for USDT/NGN, USDC/NGN, SOL/NGN
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 ">
                {[
                  {
                    label: "USDT/NGN",
                    rate: exchangeRates.usdt_ngn,
                    increment: rateIncrements.usdt_ngn,
                    trend: rateTrends.usdt_ngn,
                    color: "#22c55e",
                  },
                  {
                    label: "USDC/NGN",
                    rate: exchangeRates.usdc_ngn,
                    increment: rateIncrements.usdc_ngn,
                    trend: rateTrends.usdc_ngn,
                    color: "#3b82f6",
                  },
                  {
                    label: "SOL/NGN",
                    rate: exchangeRates.sol_ngn,
                    increment: rateIncrements.sol_ngn,
                    trend: rateTrends.sol_ngn,
                    color: "#fbbf24",
                  },
                ].map(({ label, rate, increment, trend, color }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center p-4 rounded-lg shadow bg-background transition ease-out duration-300 hover:shadow-[0_4px_24px_rgba(34,197,94,0.18)] hover:scale-[1.025] hover:border-green-400 border border-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{label}</span>
                      <span
                        className={`ml-2 text-sm font-bold ${
                          increment >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {increment >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(increment).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-2xl font-bold my-2">
                      ₦
                      {rate
                        ? rate.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : "--"}
                    </div>
                    <TrendChart data={trend} color={color} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Spl token Cards */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Portfolio</CardTitle>
              <CardDescription>
                All tokens in your connected wallet 
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingSplTokens || solBalance === null ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching tokens...</span>
                </div>
              ) : getAllTokensForPortfolio().length === 0 ? (
                <div className="text-muted-foreground">
                  No tokens found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {getAllTokensForPortfolio().map((token) => {
                    return (
                      <div
                        key={token.tokenAccount}
                        className="
                flex flex-col justify-between
                p-5 rounded-xl bg-muted/40
                shadow
                transition-all duration-300 ease-out
                hover:shadow-[0_4px_24px_rgba(34,197,94,0.18)]
                hover:scale-[1.025]
                hover:border-green-400
                border border-transparent
                min-h-[170px]
              "
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {token.logoURI ? (
                              <img
                                src={token.logoURI}
                                alt={token.symbol}
                                className="w-7 h-7 rounded-full border border-muted"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                                {token.symbol?.[0] || token.mint.slice(0, 2)}
                              </div>
                            )}
                            <div className="text-left">
                              <div className="font-semibold text-base">
                                {token.symbol}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {token.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {token.amount.toLocaleString(undefined, {
                                maximumFractionDigits: token.decimals,
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold">Mint:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono">
                                {token.mint.slice(0, 4)}...
                                {token.mint.slice(-4)}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(token.mint);
                                  toast({
                                    title: "Copied!",
                                    description:
                                      "Mint address copied to clipboard",
                                  });
                                }}
                                className="text-muted-foreground hover:text-green-500 transition-colors"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
