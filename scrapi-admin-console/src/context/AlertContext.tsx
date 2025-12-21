import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from '../components/ui/Alert';
import type { AlertType } from '../components/ui/Alert';

interface AlertItem {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const showAlert = (message: string, type: AlertType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setAlerts(prev => [...prev, { id, type, message }]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {/* Pointer events auto for alerts so they can be clicked */}
        <div className="flex flex-col items-end space-y-2 pointer-events-auto">
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              {...alert}
              onClose={removeAlert}
            />
          ))}
        </div>
      </div>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
