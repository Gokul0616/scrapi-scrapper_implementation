import React, { useState } from 'react';
import { Gift, Copy, Check, Users, ExternalLink, Link as LinkIcon, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

const ReferralsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate a dummy referral link
  const referralId = user?.username ? user.username.substring(0, 8) : 'user123';
  const referralLink = `https://scrapi.com/r/${referralId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ description: "Referral link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-0 pt-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Refer a Friend</h2>
        <p className="text-sm text-muted-foreground">
          Invite your friends to Scrapi and both of you will earn compute credits.{' '}
          <a href="#" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Learn about our referral program <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Hero Banner */}
      <div className="border border-border rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 overflow-hidden">
        <div className="px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
              <Gift className="w-3.5 h-3.5" />
              Give $20, Get $20
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Earn $20 in platform credits for every friend who signs up and runs their first Actor.
            </h3>
            <p className="text-sm text-muted-foreground">
              Your friends will also receive $20 in bonus credits to help them get started.
            </p>
          </div>
        </div>
      </div>

      {/* Link Card */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-1.5 border-b border-border bg-accent">
          <h3 className="text-sm font-bold text-foreground">Your Referral Link</h3>
        </div>
        <div className="p-5">
           <label className="text-sm font-medium text-foreground block mb-2">
             Share this link with your friends and network:
           </label>
           <div className="flex items-center gap-3">
             <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm text-foreground truncate select-all">{referralLink}</span>
             </div>
             <Button 
               onClick={handleCopy} 
               variant="outline" 
               className="shrink-0 group hover:bg-muted"
             >
               {copied ? (
                 <><Check className="w-4 h-4 mr-2 text-green-500" /> Copied</>
               ) : (
                 <><Copy className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground" /> Copy link</>
               )}
             </Button>
           </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-1.5 border-b border-border bg-accent">
          <h3 className="text-sm font-bold text-foreground">Referral Stats</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Invites</p>
                <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <p className="text-2xl font-bold text-foreground">0</p>
                </div>
            </div>
            <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Active Referrals</p>
                <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <p className="text-2xl font-bold text-foreground">0</p>
                </div>
            </div>
            <div className="p-5 text-center">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Credits Earned</p>
                <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-500" />
                    <p className="text-2xl font-bold text-foreground">0.00</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsTab;
