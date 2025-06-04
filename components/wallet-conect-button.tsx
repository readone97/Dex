"use client"

import type { FC } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { truncateAddress } from "@/lib/utils"

export const WalletConnectButton: FC = () => {
  const { publicKey, connected } = useWallet()

  return (
    <div className="flex items-center justify-center">
      {connected && publicKey ? (
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{truncateAddress(publicKey.toString())}</div>
          <WalletMultiButton className="wallet-adapter-button-trigger bg-green-600" />
        </div>
      ) : (
        <WalletMultiButton className="wallet-adapter-button-trigger" />
      )}
    </div>
  )
}
