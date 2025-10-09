import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader } from 'lucide-react'
import { chatWithAI } from '../services/api'
import useAppStore from '../stores/appStore'
import toast from 'react-hot-toast'

const ChatIA = () => {
  const { chatMessages, addChatMessage } = useAppStore()
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')

    // Add user message
    addChatMessage({
      type: 'user',
      content: userMessage
    })

    setIsLoading(true)

    try {
      const response = await chatWithAI(userMessage)

      // Add AI response
      addChatMessage({
        type: 'ai',
        content: response.response
      })
    } catch (error) {
      toast.error(error.message || 'Error procesando la consulta')

      // Add error message
      addChatMessage({
        type: 'ai',
        content: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo.',
        isError: true
      })
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "¿En qué categoría gasto más este mes?",
    "¿Cuál fue mi compra más grande?",
    "¿Cómo puedo ahorrar más?",
    "¿Cuál es mi balance actual?",
    "¿Qué tendencias ves en mis gastos?"
  ]

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          Chat con IA Financiera
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Pregunta sobre tus finanzas y recibe respuestas inteligentes
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 card flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96">
          {!chatMessages || chatMessages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                ¡Hola! Soy tu asistente financiero
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Puedo ayudarte a entender tus gastos y darte consejos personalizados
              </p>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(question)}
                    className="text-left p-3 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {chatMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-3 max-w-xs lg:max-w-md ${
                    msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.type === 'user'
                        ? 'bg-dark-primary'
                        : msg.isError
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}>
                      {msg.type === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Message */}
                    <div className={`px-4 py-3 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-dark-primary text-white'
                        : msg.isError
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.timestamp && (
                        <p className={`text-xs mt-1 opacity-70 ${
                          msg.type === 'user' ? 'text-white' : 'text-gray-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pregunta sobre tus finanzas..."
              disabled={isLoading}
              className="input-field pr-12"
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-dark-primary hover:bg-dark-primary hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Helper text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          La IA analiza solo tus datos financieros personales para darte respuestas precisas
        </p>
      </div>
    </div>
  )
}

export default ChatIA
