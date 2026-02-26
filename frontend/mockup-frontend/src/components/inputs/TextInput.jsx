import React, { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

const TextInput = ({ value, onChange, label, placeholder, type, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
            <div className="relative">
                <input
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
                    {...props}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                />
                {type === "password" && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                        {showPassword ? (
                            <FaEyeSlash size={20} />
                        ) : (
                            <FaEye size={20} />
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default TextInput

