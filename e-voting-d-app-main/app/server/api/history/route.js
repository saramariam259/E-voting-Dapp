import ElectionLog from "@/databaseModels/electionLogsSchema";
import Voter from "@/databaseModels/voterSchema"
import Connect from "@/dbConfig/connect";
import { NextResponse } from "next/server";



export async function POST(request){
    try {
        await Connect()
        const { name } = await request.json()
        const voter = await Voter.findOne({digitalWallet: name})
        const ParticipatedElections = await ElectionLog.find({
            "voters.voterid": voter.voterId,
            "voters.voted": true
          })
        if(ParticipatedElections.length>0){
            return NextResponse.json({message: 'Elections found', status: 200, ParticipatedElections })
        }
        return NextResponse.json({message: 'Elections not found', status: 205 })
    } catch (error) {
        return NextResponse.json({message: 'Internal server error', status: 400, error})
    }
}