import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [openModal, setOpenModal] = useState(null);
  const [modalData, setModalData] = useState(null);

  // Global ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && openModal) {
        closeModal();
      }
    };

    if (openModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [openModal]);

  const openModalHandler = useCallback((modalId, data = null) => {
    // If a modal is already open, close it first
    if (openModal && openModal !== modalId) {
      console.log(`Closing ${openModal} to open ${modalId}`);
    }
    setOpenModal(modalId);
    setModalData(data);
  }, [openModal]);

  const closeModal = useCallback(() => {
    setOpenModal(null);
    setModalData(null);
  }, []);

  const isModalOpen = useCallback((modalId) => {
    return openModal === modalId;
  }, [openModal]);

  const value = {
    openModal: openModalHandler,
    closeModal,
    isModalOpen,
    currentModal: openModal,
    modalData
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};
