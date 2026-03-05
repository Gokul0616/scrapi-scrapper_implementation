import React from 'react';
import CreateOrganizationModal from './CreateOrganizationModal';
import UpgradeModal from './UpgradeModal';
import DeleteAccountModal from './DeleteAccountModal';

const GlobalModals = () => {
    return (
        <>
            <CreateOrganizationModal />
            <UpgradeModal />
            <DeleteAccountModal />
        </>
    );
};

export default GlobalModals;
