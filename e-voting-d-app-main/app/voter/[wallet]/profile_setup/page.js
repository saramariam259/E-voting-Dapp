'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Select from 'react-select'
import { states } from '@/utils/province'
import { signOut, useSession } from 'next-auth/react'
import { LoadingOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'

function Profile_Setup() {
  const { wallet } = useParams()
  const router = useRouter()
  const [selectedState, setSelectedState] = useState(null)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const { data: session, status } = useSession()
  const [zipCode, setZipcode] = useState('')
  const [FormData, setFormData] = useState({
    fullname: '',
    voterId: '',
    address: '',
    city: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [componentMount, setComponentMount] = useState({
    registrationMount: true,
    walletLinkMount: false,
    faceRecognitionMount: false,
  })
  const nameRef = useRef(null)
  const voterIdRef = useRef(null)
  const addressRef = useRef(null)
  const cityRef = useRef(null)
  const zipCodeRef = useRef(null)

  const handleBeforeUnload = (event) => {
    event.preventDefault()
    event.returnValue =
      'Are you sure you want to leave? Your data will be lost.'
  }

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const options = states.map((state) => ({
    label: state.label,
    value: state.value,
  }))

  const filteredOptions = selectedState
    ? states.find((state) => state.value === selectedState.value)?.districts ||
      []
    : []

  const changeZipcode = (event) => {
    const inputValue = event.target.value
    const regex = /^[0-9]{0,6}$/
    if (regex.test(inputValue)) {
      setZipcode(inputValue)
    }
  }

  const handleVoterIdChange = (e) => {
    const inputValue = e.target.value
    if (inputValue === '') {
      setFormData((prevState) => ({ ...prevState, voterId: inputValue }))
    } else {
      const regex = /^[a-zA-Z0-9]+$/
      if (regex.test(inputValue)) {
        setFormData((prevState) => ({
          ...prevState,
          voterId: inputValue.toUpperCase(),
        }))
      }
    }
  }

  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { name: digitalWallet } = session?.user
      const { fullname, address, voterId, city } = FormData
      const { label: district } = selectedDistrict
      const { label: state } = selectedState
      if (
        !fullname ||
        !address ||
        !voterId ||
        !city ||
        !district ||
        !state ||
        !zipCode
      ) {
        setIsLoading(false)
        toast.error('please fill all the fields', { icon: '🚫' })
        return
      }
      if (voterId.length !== 10) {
        setIsLoading(false)
        toast.error('Invalid voter Id', { icon: '🚫' })
        return
      }
      if (zipCode.length !== 6) {
        setIsLoading(false)
        toast.error('Invalid pincode', { icon: '🚫' })
        return
      }
      if (!digitalWallet) {
        setIsLoading(false)
        toast.error('Network busy', { icon: '🚫' })
        return
      }
      fetch('/server/api/voter_registration', {
        cache: 'no-store',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname,
          address,
          voterId,
          city,
          district,
          state,
          zipCode,
          digitalWallet,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          const ok = (data?.message).includes('registered successfully')
          const alreadyRegistered =
            (data?.message).includes('already registered')
          const alreadyLinked = (data?.message).includes(
            'already Linked walletAddress'
          )
          const notOk = (data?.message).includes('Internal server error')
          setIsLoading(false)

          if (ok) {
            setComponentMount({
              registrationMount: false,
              walletLinkMount: true,
              faceRecognitionMount: false,
            })
            toast.success('voterId registered successfully')
          }

          if (alreadyRegistered) {
            toast.error('Voter Already Registered.')
          }

          if (alreadyLinked) {
            toast.error('This wallet is linked with other voterId.', {
              icon: '🚫',
            })
          }

          if (notOk) {
            toast.error('Incorrect Data Found', { icon: '🚫' })
          }
        })
    } catch (error) {
      setIsLoading(false)
      toast.error('network unavilable', { icon: '🚫' })
      console.log(error)
    }
  }

  const secondPhase = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      setComponentMount({
        registrationMount: false,
        walletLinkMount: false,
        faceRecognitionMount: true,
      })
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      toast.error('Network busy', { icon: '🚫' })
      console.log(error)
    }
  }

  const completeRegistration = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { name } = session?.user
      const { voterId } = FormData
      fetch('/api/detect_face', {
        cache: 'no-store',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: voterId }),
      })
        .then((response) => response.json())
        .then(async (data) => {
          const { message } = await data
          console.log(data)
          const success = message.includes('Face Reg Successfull')
          if (success) {
            fetch('/server/api/face_reg', {
              cache: 'no-store',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ voterId }),
            })
              .then((response) => response.json())
              .then(async (data) => {
                console.log(data)
                const { message } = await data
                const ok = message.includes('Face ID updated successfully')
                if (ok) {
                  toast.success('Face Enrollment Success')
                  router.push(`/voter/${name}/dashboard`)
                } else {
                  setIsLoading(false)
                  toast.error('Registration failed. Please Try again', {
                    icon: '🚫',
                  })
                }
              })
              .catch((e) => {
                console.error(e)
                toast.error('Registration failed. Please Try again', {
                  icon: '🚫',
                })
                setIsLoading(false)
              })
          } else {
            setIsLoading(false)
            toast.error('Registration failed. Please Try again', { icon: '🚫' })
          }
        })
        .catch((e) => {
          console.error(e)
          toast.error('Registration failed. Please Try again', { icon: '🚫' })
          setIsLoading(false)
        })
    } catch (error) {
      setIsLoading(false)
      toast.error('Registration failed. Please Try again', { icon: '🚫' })
      console.log(error)
    }
  }

  return (
    <>
      <div className='min-h-screen bg-[#353935] relative overflow-hidden'>
        <div className='w-full flex justify-center items-center'>
          <div className='mx-auto px-3 lg:px-10 rounded-2xl fixed top-2 md:top-8  shadow-md w-full md:w-5/6 z-50 bg-black flex justify-between py-4 items-center'>
            <div className='flex'>
              <p
                onClick={() => router.push('/')}
                className='text-2xl text-white font-bricolage font-medium cursor-pointer'
              >
                VOTECHAIN
              </p>
            </div>
            <div className='flex justify-between gap-6'>
              <p className='hidden lg:flex text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>{`${wallet.substring(0, 4)}****${wallet.substring(wallet.length - 4)}`}</p>
              <p
                onClick={() => signOut({ callbackUrl: '/' })}
                className='text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        <div className='flex justify-center items-center w-full'>
          <div className='flex pt-24 lg:pt-36 justify-between items-center w-2/3'>
            <button
              className={`bg-[#81fbe9] ${componentMount.registrationMount == false && 'bg-opacity-50  cursor-not-allowed'} text-black font-bold py-1 px-3 rounded-full`}
            >
              1
            </button>
            <div className='flex border-t border-b border-[#81fbe9] h-0 w-full'></div>
            <button
              className={`bg-[#81fbe9] ${componentMount.registrationMount == false && componentMount.walletLinkMount == false && 'bg-opacity-60 cursor-not-allowed'} text-black font-bold py-1 px-3 rounded-full`}
            >
              2
            </button>
            <div className='flex border-t border-b border-[#81fbe9] h-0 w-full'></div>
            <button
              className={`bg-[#81fbe9] text-black font-bold py-1 px-3 rounded-full`}
            >
              3
            </button>
          </div>
        </div>

        {componentMount.registrationMount == true &&
          componentMount.walletLinkMount == false &&
          componentMount.faceRecognitionMount == false && (
            <div className='pt-10 p-4 flex items-center justify-center'>
              <div className='container max-w-screen-lg mx-auto'>
                <div>
                  <h2 className='font-semibold text-xl text-white'>
                    Registration
                  </h2>
                  <p className='text-white mb-6'>
                    Enter your personal informations.
                  </p>

                  <div className='bg-[#36454F] rounded shadow-lg p-4 px-4 md:p-8 mb-6'>
                    <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 lg:grid-cols-3'>
                      <div className='text-white'>
                        <p className='font-medium text-lg'>Personal Details</p>
                        <p>Please fill out all the fields.</p>
                      </div>

                      <div className='lg:col-span-2'>
                        <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 md:grid-cols-5'>
                          <div className='md:col-span-5'>
                            <label className='text-white' htmlFor='full_name'>
                              Full Name
                            </label>
                            <input
                              type='text'
                              ref={nameRef}
                              name='fullname'
                              onChange={(e) => handleChange(e, 'fullname')}
                              id='full_name'
                              className='h-10 border mt-1 rounded px-4 w-full bg-gray-50 outline-none'
                            />
                          </div>

                          <div className='md:col-span-5'>
                            <label className='text-white' htmlFor='voterId'>
                              Voter Id
                            </label>
                            <input
                              type='text'
                              ref={voterIdRef}
                              name='voterId'
                              id='voterId'
                              value={FormData.voterId}
                              onChange={handleVoterIdChange}
                              className='h-10 border mt-1 rounded px-4 w-full bg-gray-50 outline-none uppercase'
                              placeholder='547893'
                            />
                          </div>

                          <div className='md:col-span-2'>
                            <label className='text-white' htmlFor='country'>
                              State / region
                            </label>
                            <div className='h-10 bg-gray-50 flex border border-gray-200 rounded items-center mt-1'>
                              <Select
                                className='appearance-none outline-none text-gray-800 w-full bg-transparent'
                                options={options}
                                value={selectedState}
                                onChange={(selectedOption) => {
                                  setSelectedState(selectedOption)
                                  setSelectedDistrict(null)
                                }}
                              />
                            </div>
                          </div>

                          <div className='md:col-span-2'>
                            <label className='text-white' htmlFor='state'>
                              District
                            </label>
                            <div className='h-10 bg-gray-50 flex border border-gray-200 rounded items-center mt-1'>
                              <Select
                                className='appearance-none outline-none text-gray-800 w-full bg-transparent'
                                options={filteredOptions}
                                value={selectedDistrict}
                                onChange={(selectedOption) =>
                                  setSelectedDistrict(selectedOption)
                                }
                              />
                            </div>
                          </div>

                          <div className='md:col-span-1'>
                            <label className='text-white' htmlFor='zipcode'>
                              Pincode
                            </label>
                            <input
                              type='text'
                              ref={zipCodeRef}
                              name='zipcode'
                              id='zipcode'
                              value={zipCode}
                              onChange={changeZipcode}
                              className='outline-none transition-all flex items-center h-10 border mt-1 rounded px-4 w-full bg-gray-50'
                              placeholder=''
                            />
                          </div>

                          <div className='md:col-span-3'>
                            <label className='text-white' htmlFor='address'>
                              Address / Street
                            </label>
                            <input
                              type='text'
                              ref={addressRef}
                              name='address'
                              id='address'
                              onChange={(e) => handleChange(e, 'address')}
                              className='h-10 border mt-1 rounded px-4 w-full bg-gray-50 outline-none'
                              placeholder=''
                            />
                          </div>

                          <div className='md:col-span-2'>
                            <label className='text-white' htmlFor='city'>
                              City
                            </label>
                            <input
                              type='text'
                              ref={cityRef}
                              name='city'
                              id='city'
                              onChange={(e) => handleChange(e, 'city')}
                              className='h-10 border mt-1 rounded px-4 w-full bg-gray-50 outline-none'
                              placeholder=''
                            />
                          </div>

                          <div className='md:col-span-5 text-right pt-5'>
                            <div className='inline-flex items-end'>
                              <button
                                disabled={isLoading}
                                onClick={handleSubmit}
                                className='bg-[#81fbe9] box-shadow text-black font-bold py-2 px-4 rounded'
                              >
                                {isLoading ? <LoadingOutlined /> : 'Submit'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <span className='md:absolute bottom-0 right-0 p-4 float-right'>
                  <img
                    src='https://www.buymeacoffee.com/assets/img/guidelines/logo-mark-3.svg'
                    alt='Buy Me A Coffee'
                    className='transition-all rounded-full w-14 -rotate-45 hover:shadow-sm shadow-lg ring hover:ring-4 ring-white'
                  />
                </span>
              </div>
            </div>
          )}

        {componentMount.registrationMount == false &&
          componentMount.walletLinkMount == true &&
          componentMount.faceRecognitionMount == false && (
            <div className='pt-10 p-4 flex items-center justify-center'>
              <div className='container max-w-screen-lg mx-auto'>
                <div>
                  <h2 className='font-semibold text-xl text-white'>
                    Link Wallet
                  </h2>
                  <p className='text-white mb-6'>
                    Link Voter Id with your digital wallet.
                  </p>

                  <div className='bg-[#36454F] rounded shadow-lg p-4 px-4 md:p-8 mb-6'>
                    <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 lg:grid-cols-3'>
                      <div className='text-white'>
                        <p className='font-medium text-lg'>Wallet Details</p>
                        <p>
                          Befor linking make sure you stored your wallet's
                          secret phrase.
                        </p>
                      </div>

                      <div className='lg:col-span-2'>
                        <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 md:grid-cols-5'>
                          <div className='md:col-span-5'>
                            <label className='text-white' htmlFor='full_name'>
                              Wallet Address
                            </label>
                            <input
                              type='text'
                              value={session ? session.user.name : ''}
                              disabled
                              className='h-10 border mt-1 rounded px-4 w-full bg-gray-50 outline-none'
                            />
                          </div>

                          <div className='md:col-span-5 text-right pt-5'>
                            <div className='inline-flex items-end'>
                              <button
                                disabled={isLoading}
                                onClick={secondPhase}
                                className='bg-[#81fbe9] box-shadow text-black font-bold py-2 px-4 rounded'
                              >
                                {isLoading ? <LoadingOutlined /> : 'continue'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <span className='md:absolute bottom-0 right-0 p-4 float-right'>
                  <img
                    src='https://www.buymeacoffee.com/assets/img/guidelines/logo-mark-3.svg'
                    alt='Buy Me A Coffee'
                    className='transition-all rounded-full w-14 -rotate-45 hover:shadow-sm shadow-lg ring hover:ring-4 ring-white'
                  />
                </span>
              </div>
            </div>
          )}
        {componentMount.registrationMount == false &&
          componentMount.walletLinkMount == false &&
          componentMount.faceRecognitionMount == true && (
            <div className='pt-10 p-4 flex items-center justify-center'>
              <div className='container max-w-screen-lg mx-auto'>
                <div>
                  <h2 className='font-semibold text-xl text-white'>
                    Face Authentication
                  </h2>
                  <p className='text-white mb-6'>Enroll your identity.</p>

                  <div className='bg-[#36454F] rounded shadow-lg p-4 px-4 md:p-8 mb-6'>
                    <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 lg:grid-cols-3'>
                      <div className='text-white'>
                        <p className='font-medium text-lg'>Face Enrollment</p>
                        <p>Please avoid wearing glasses or hats.</p>
                      </div>

                      <div className='lg:col-span-2 h-[40vh] flex justify-end items-end'>
                        <button
                          disabled={isLoading}
                          onClick={completeRegistration}
                          className='bg-[#81fbe9] box-shadow text-black font-bold py-2 px-4 rounded'
                        >
                          {isLoading ? <LoadingOutlined /> : 'Enroll Face'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <span className='md:absolute bottom-0 right-0 p-4 float-right'>
                  <img
                    src='https://www.buymeacoffee.com/assets/img/guidelines/logo-mark-3.svg'
                    alt='Buy Me A Coffee'
                    className='transition-all rounded-full w-14 -rotate-45 hover:shadow-sm shadow-lg ring hover:ring-4 ring-white'
                  />
                </span>
              </div>
            </div>
          )}
      </div>
    </>
  )
}

export default Profile_Setup
