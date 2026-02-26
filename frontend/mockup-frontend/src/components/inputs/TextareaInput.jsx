import React from 'react'

const TextareaInput = ({ value, onChange, label, placeholder, ...props }) => {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                {...props}
            />
        </div>
    )
}

export default TextareaInput

