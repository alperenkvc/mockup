import React, { useState } from 'react'
import TextInput from '../inputs/TextInput'
import { useAuth } from '../../contexts/AuthContext'

const SignUpForm = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await register({
        email,
        password,
        username,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      })
      // Reset form
      setEmail('')
      setPassword('')
      setUsername('')
      setFirstName('')
      setLastName('')
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <TextInput
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        label="Email"
        placeholder="Enter your email"
        type="email"
        required
        disabled={isLoading}
      />
      <TextInput
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        label="Username"
        placeholder="Choose a username"
        type="text"
        required
        disabled={isLoading}
      />
      <TextInput
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        label="Password"
        placeholder="Create a password"
        type="password"
        required
        disabled={isLoading}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          label="First Name"
          placeholder="First name (optional)"
          type="text"
          disabled={isLoading}
        />
        <TextInput
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          label="Last Name"
          placeholder="Last name (optional)"
          type="text"
          disabled={isLoading}
        />
      </div>
      <button 
        type="submit" 
        className="btn-primary w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>
      <div className="text-center mt-4">
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-green-500 hover:text-green-400 font-medium"
            disabled={isLoading}
          >
            Login
          </button>
        </p>
      </div>
    </form>
  )
}

export default SignUpForm
