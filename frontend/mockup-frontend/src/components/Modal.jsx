import React from 'react'

const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center w-full h-full bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose} // closes modal when clicking on overlay
    >
      <div
        className="relative p-4 w-full max-w-2xl max-h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // prevents closing when clicking modal content
      >
        <div className="relative bg-gray-900 rounded-lg shadow-sm ">

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900   transition-all rounded-lg w-8 h-8 flex items-center justify-center "
            >
              ×
            </button>
          
          {/* Modal header */}
          <div className=" flex items-center justify-center p-4 md:p-5 rounded-t">
            <h3 className="text-lg font-bold text-gray-200 ">{title}</h3>
          </div>

          {/* Modal body */}
          <div className="p-4 md:p-5 space-y-4 ">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal