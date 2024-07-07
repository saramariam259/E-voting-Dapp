'use client'

import { PreLoader } from '@/components/preLoader'
import VoterNavbar from '@/components/voterNavbar'
import { useSession } from 'next-auth/react'
import React, { useEffect, useState } from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import { Announce_winner } from '@/blockchainActions/announceWinner'
import toast from 'react-hot-toast'

const Announcements = () => {
  const [preLoading, setPreLoading] = useState(true)
  const [faceAuthenticated, setFaceAuthenticated] = useState(false)
  const [voterId, setVoterId] = useState(null)
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [Loading, setLoading] = useState(false)
  const [participatedElections, setParticipatedElections] = useState([])
 

  const checkFaceauthenticated = async () => {
    try {
      if (session) {
        const { name } = session?.user
        const face_reg = await fetch('/server/api/face_reg_status', {
          cache: 'no-store',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        })
        const face_data = await face_reg.json()
        const notValidated =
          await (face_data?.message).includes('Not validated')
        const validated = await (face_data?.message).includes('face validated')
        if (notValidated) {
          const { id } = await face_data
          setVoterId(id)
          setFaceAuthenticated(false)
        }
        if (validated) {
          const { id } = await face_data
          setVoterId(id)
          setFaceAuthenticated(true)
        }
      }
    } catch (error) {
      console.log(error)
    }
  }

  const checkHistory = async () => {
    try {
        if(session){
            const { name } = await session.user
            const response = await fetch('/server/api/history', {
                cache: 'no-store',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({name})
            })
    
            const data = await response.json()
    
            const ok = (data.message).includes('Elections found')
            const notOk = (data.message).includes('Elections not found') || (data.message).includes('Internal server error')
    
            // console.log(data)
    
            if (ok) {
              const { ParticipatedElections } = data
              const electionsData = ParticipatedElections.map(async (election) => {
                const contractAddress = election.contract
                const winners = election.status === false ? await Announce_winner(contractAddress) : []
                return {
                  electionname: election.electionname,
                  electiondescription: election.electiondescription,
                  status: election.status,
                  createdat: election.createdAt,
                  contract: contractAddress,
                  winners: winners,
                }
              })
      
              const results = await Promise.all(electionsData)
              setParticipatedElections(results)
            }
        }
        setTimeout(() => {
            setPreLoading(false)
          }, 2000)
    } catch (error) {
        setTimeout(() => {
            setPreLoading(false)
          }, 1000)
        console.log(error)
    }
  }

  useEffect(() => {
    checkFaceauthenticated()
  }, [session, status])

  useEffect(() => {
    checkHistory()
  }, [])

  const FaceDetect = async () => {
    try {
      setLoading(true)
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
          // console.log(data)
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
                  setLoading(false)
                  setFaceAuthenticated(true)
                } else {
                  setIsLoading(false)
                  toast.error('Registration failed. Please Try again', {
                    icon: '🚫',
                  })
                }
              })
          } else {
            toast.error('Registration failed. Please Try again', { icon: '🚫' })
            setLoading(false)
          }
        })
        .catch((e) => {
          console.error(e)
          setLoading(false)
          toast.error('Registration failed. Please Try again', { icon: '🚫' })
        })
    } catch (error) {
      console.log(error)
      setLoading(false)
      toast.error('Registration failed. Please Try again', { icon: '🚫' })
    }
  }

  



  if (preLoading) {
    return <PreLoader />
  } else {
    return (
      <>
        <VoterNavbar route={'announcements'} />
        <div className='w-full bg-[#353935] pt-28 lg:pt-36 px-3 lg:px-20 min-h-screen justify-center items-start pb-8 lg:pb-0'>
        {!faceAuthenticated ? (
          <>
            <div className='w-full flex flex-wrap justify-center items-center'>
              <p className='text-white font-medium font-bricolage text-lg lg:text-4xl xl:text-5xl'>
                Please Enroll Your Face
              </p>
            </div>
            <div className='bg-[#36454F] rounded shadow-lg p-4 px-4 md:p-8 mb-6 mt-10'>
              <div className='grid gap-4 gap-y-2 text-sm grid-cols-1 lg:grid-cols-3'>
                <div className='text-white'>
                  <p className='font-medium text-lg'>Face Enrollment</p>
                  <p>Please avoid wearing glasses or hats.</p>
                </div>

                <div className='lg:col-span-2 h-[40vh] flex justify-end items-end'>
                  <button
                    disabled={Loading}
                    onClick={FaceDetect}
                    className='bg-[#81fbe9] box-shadow text-black font-bold py-2 px-4 rounded'
                  >
                    {Loading ? <LoadingOutlined /> : 'Enroll Face'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className='w-full flex flex-wrap justify-center items-center'>
                <p className='text-white font-medium font-bricolage text-lg lg:text-4xl xl:text-5xl'>
                  History of Participation
                </p>
              </div>
              <div className='pt-10 grid lg:grid-cols-3 gap-4'>
                {participatedElections.length > 0 && 
                    participatedElections.map((election, index)=>(
                        <div key={index} className='bg-[#36454F] rounded-xl px-3 py-3 overflow-hidden'>
                            <div className='flex flex-col gap-3 justify-start items-start'>
                                <p className='text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>Election: {election.electionname}</p>
                                <p className='text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>Description: {election.electiondescription}</p>
                                {election.status === true &&
                                <span className='flex text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>
                                    Result: Pending ⏳
                                </span>                            
                                }
                                <p className='text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>Conducted At: {election.createdat}</p>
                                <span className='flex text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>
                                {election.status === false && 
                                <>
                                {election.winners.length > 1 ? 'Winners: ' : 'Winner: '}
                                 { election.winners.length > 0 && election.winners.map((winner, index)=>{
                                    return(
                                      <p key={index} className='text-[#a3a3a3] hover:text-[#f5f5f5] text-sm font-normal font-bricolage px-2 cursor-pointer'>{winner[0]}</p>
                                    )
                                  })}
                                  </>
                                }
                                </span>
                            </div>
                        </div>
                    ))
                }
              </div>
          </>
        )}
        </div>
      </>
    )
  }
}

export default Announcements
