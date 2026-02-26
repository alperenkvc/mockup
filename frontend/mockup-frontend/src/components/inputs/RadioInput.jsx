import React from 'react'

const RadioInput = ({ label, name, value, checked, onChange, ...props }) => {
    return (
        <label className="flex items-center gap-2 text-gray-300">
            <input 
                type="radio" 
                name={name}
                value={value}
                checked={checked}
                onChange={onChange}
                className="text-green-500"
                {...props}
            />
            <span>{label}</span>
        </label>
    )
}

export default RadioInput

