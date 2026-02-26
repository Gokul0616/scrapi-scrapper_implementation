import React from 'react';
import CreateOrganizationModal from './CreateOrganizationModal';
import UpgradeModal from './UpgradeModal';

const GlobalModals = () => {
    return (
        <>
            <CreateOrganizationModal />
            <UpgradeModal />
        </>
    );
};

export default GlobalModals;
