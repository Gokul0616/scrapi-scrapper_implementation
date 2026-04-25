import React, { useState } from 'react';
import { Bell, Mail, Phone, Activity, AlertTriangle } from 'lucide-react';
import Toggle from '../Toggle';

const NotificationsTab = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [billingUpdates, setBillingUpdates] = useState(true);
  const [productNews, setProductNews] = useState(true);
  const [runFailures, setRunFailures] = useState(true);

  return (
    <div className="mt-0 pt-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choose what notifications you want to receive and how you want to be alerted.
        </p>
      </div>

      {/* Notification Channels */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-1.5 border-b border-border bg-accent">
          <h3 className="text-sm font-bold text-foreground">Notification Channels</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive alerts and updates directly to your registered email address.
                </p>
              </div>
            </div>
            <Toggle on={emailAlerts} onChange={setEmailAlerts} />
          </div>
          
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive real-time push notifications in your browser.
                </p>
              </div>
            </div>
            <Toggle on={pushAlerts} onChange={setPushAlerts} />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="px-5 py-1.5 border-b border-border bg-accent">
          <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
        </div>
        <div className="divide-y divide-border">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Actor & Run Failures</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get notified immediately if an actor fails to run or encounters unexpected errors.
                </p>
              </div>
            </div>
            <Toggle on={runFailures} onChange={setRunFailures} />
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Activity className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Billing & Usage Updates</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alerts about upcoming invoices, successful payments, and threshold limits.
                </p>
              </div>
            </div>
            <Toggle on={billingUpdates} onChange={setBillingUpdates} />
          </div>

          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Product News & Updates</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stay in the loop with major feature releases and platform news.
                </p>
              </div>
            </div>
            <Toggle on={productNews} onChange={setProductNews} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
