import React from 'react';
import { ShieldCheck, Mail, Key, Shield, ExternalLink, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import SectionHeader from '../ui/SectionHeader';

const LoginPrivacyTab = () => {
  return (
    <div className="mt-0 pt-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Login & Privacy</h2>
        <p className="text-sm text-muted-foreground">
          Manage your password, connected accounts, and two-factor authentication.{' '}
          <a href="#" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Learn more about security <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Connected Accounts Card */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <SectionHeader title="Connected Accounts">
          <button className="h-[28px] flex items-center gap-1.5 px-3 rounded-md border border-border bg-card text-[13px] font-bold text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-all active:scale-95 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Connect Provider
          </button>
        </SectionHeader>
        <div className="py-12 text-center">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">You don't have any third-party accounts connected yet.</p>
        </div>
      </div>

      {/* Security Settings Card */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <SectionHeader title="Security Settings" />
        <div className="divide-y divide-border">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Key className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set a strong password to protect your account.
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-border text-foreground hover:bg-muted shrink-0 text-sm h-8">
              Change password
            </Button>
          </div>
          
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Two-factor authentication (2FA)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add an extra layer of security to your account. We'll ask for an authentication code when you sign in.
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-border text-foreground hover:bg-muted shrink-0 text-sm h-8">
              Enable 2FA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPrivacyTab;
