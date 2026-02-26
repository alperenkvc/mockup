import React, { useState } from 'react'
import TextInput from '../inputs/TextInput'
import { useAuth } from '../../contexts/AuthContext'

const LoginForm = ({ onSuccess, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      await login(email, password)

      
      // Reset form
      setEmail('')
      setPassword('')
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        label="Password"
        placeholder="Enter your password"
        type="password"
        required
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="btn-primary w-full mt-4"
        disabled={isLoading}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      <div className="text-center mt-4">
        <p className="text-sm text-gray-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-green-500 hover:text-green-400 font-medium"
            disabled={isLoading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </form>
  )
}

export default LoginForm
