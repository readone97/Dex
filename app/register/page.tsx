"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push("/dashboard")
      }
    }
    checkSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/dashboard")
      }
    })
    return () => listener?.subscription.unsubscribe()
  }, [router])

  // Step 1: Username creation
  const handleCreateUsername = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim().length < 3) {
      toast({
        title: "Invalid username",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      })
      return
    }
    setStep(2)
  }

  // Step 2: Send OTP for email verification
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Send OTP to the email
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // This allows creating new users via OTP
          data: {
            username: username.trim()
          }
        }
      })

      if (error) {
        console.error("OTP send error:", error)
        
        if (error.message.includes('Signups not allowed')) {
          toast({
            title: "Registration Disabled",
            description: "New account registration is currently disabled. Please contact support.",
            variant: "destructive",
          })
        } else if (error.message.includes('Email rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many requests. Please wait before trying again.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Failed to send OTP",
            description: error.message || "Please try again later.",
            variant: "destructive",
          })
        }
        return
      }

      // Successfully sent OTP
      toast({
        title: "OTP Sent!",
        description: "Please check your email for the verification code.",
        variant: "default",
      })
      
      setShowOtpInput(true)
      
    } catch (error: any) {
      console.error("Send OTP Error:", error)
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otp.trim()) {
      toast({
        title: "OTP required",
        description: "Please enter the verification code from your email",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Verify the OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'email'
      })
      
      if (error) {
        console.error("OTP verification error:", error)
        
        if (error.message.includes('Token has expired')) {
          toast({
            title: "OTP Expired",
            description: "The verification code has expired. Please request a new one.",
            variant: "destructive",
          })
        } else if (error.message.includes('Invalid token')) {
          toast({
            title: "Invalid OTP",
            description: "The verification code is incorrect. Please check and try again.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Verification failed",
            description: error.message || "Please try again.",
            variant: "destructive",
          })
        }
        return
      }
      
      if (data.session && data.user) {
        toast({
          title: "Registration Successful!",
          description: "Your account has been created and verified.",
          variant: "default",
        })
        
        // Redirect to login page after successful registration
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      }
    } catch (error: any) {
      console.error("Verification Error:", error)
      toast({
        title: "Verification failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToStep1 = () => {
    setStep(1)
    setShowOtpInput(false)
    setOtp("")
  }

  const changeEmail = () => {
    setShowOtpInput(false)
    setOtp("")
  }

  const resendOtp = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: {
            username: username.trim()
          }
        }
      })

      if (error) {
        toast({
          title: "Failed to resend OTP",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "OTP Resent!",
          description: "Please check your email for the new verification code.",
          variant: "default",
        })
      }
    } catch (error: any) {
      toast({
        title: "Failed to resend OTP",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center py-8 bg-background text-foreground">
      <Link href="/" className="mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>Complete the steps below to get started with Amigo Exchange</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={`step-${step}`} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="step-1" 
                className={step === 1 ? "bg-primary text-primary-foreground" : ""}
              >
                Username
              </TabsTrigger>
              <TabsTrigger 
                value="step-2" 
                className={step === 2 ? "bg-primary text-primary-foreground" : ""}
              >
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="step-1" className="mt-6 space-y-4">
              <form onSubmit={handleCreateUsername}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Create Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This username will be used to identify you on the platform.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" type="button" onClick={() => router.push("/")}>
                      Back
                    </Button>
                    <Button type="submit" disabled={username.trim().length < 3}>
                      Next
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="step-2" className="mt-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={showOtpInput}
                  />
                </div>

                {!showOtpInput ? (
                  <form onSubmit={handleSendOtp}>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={goBackToStep1}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading || !email.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send OTP"
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                        <p className="font-medium mb-2">📧 Check your email!</p>
                        <p>We've sent a 6-digit verification code to <strong>{email}</strong></p>
                        <p className="mt-2">Enter the code below to verify your account.</p>
                      </div>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setOtp(value)
                        }}
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        autoComplete="one-time-code"
                      />
                      <p className="text-xs text-muted-foreground">
                        Didn't receive the code? 
                        <button
                          type="button"
                          onClick={resendOtp}
                          disabled={isLoading}
                          className="ml-1 text-primary hover:underline disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      </p>
                      <p className="text-xs text-green-600">
                        Code length: {otp.length}/6 {otp.length >= 4 ? "✓" : ""}
                      </p>
                    </div>

                    <Separator />

                    <form onSubmit={handleVerifyOtp}>
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={changeEmail}
                        >
                          Change Email
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading || otp.length < 4}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            `Verify OTP${otp.length > 0 ? ` (${otp.length})` : ''}`
                          )}
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t p-6">
          <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`}></span>
            <span className={`h-2 w-2 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`}></span>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Step {step} of 2: {step === 1 ? "Create Username" : "Verify Email"}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
