import face_recognition
import cv2
import os, sys
import numpy as np
import math

from collections import deque


def face_confidence(face_distance, face_match_threshold=0.6):
    range = (1.0 - face_match_threshold)
    linear_val = (1.0 - face_distance) / (range * 2.0)

    if face_distance > face_match_threshold:
        return str(round(linear_val * 100, 2))
    else:
        value = (linear_val +((1.0 - linear_val) * math.pow((linear_val - 0.5) * 2, 0.2))) * 100
        return str(round(value, 2))
    
class FaceRecognition:
    face_locations = []
    face_encodings = []
    face_names = []
    known_face_encodings = []
    known_face_names = []
    process_current_frame = True

    last_matches = deque(maxlen=50)

    def __init__(self):
        self.encode_faces()
    

    def encode_faces(self):
        for image in os.listdir('api/faces'):
            face_image = face_recognition.load_image_file(f'api/faces/{image}')
            face_encoding = face_recognition.face_encodings(face_image)[0]

            self.known_face_encodings.append(face_encoding)
            self.known_face_names.append(image)


    def run_recognition(self, user_id):
        video_capture = cv2.VideoCapture(0)

        match_count = 0


        if not video_capture.read():
            sys.exit('video source not found...')
        
        id = None

        imgBackground = cv2.imread('api/background.png')

        while True:
            ret, frame = video_capture.read()
            frame = cv2.flip(frame, 1)

            if self.process_current_frame:
                small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                rgb_small_frame = np.ascontiguousarray(small_frame[:, :, ::-1])

                self.face_locations = face_recognition.face_locations(rgb_small_frame)
                self.face_encodings = face_recognition.face_encodings(rgb_small_frame, self.face_locations)

                self.face_names = []
                for face_encoding in self.face_encodings:
                    matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                    name = 'UnKnown'
                    confidence = '0'

                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    best_match_index = np.argmin(face_distances)

                    if matches[best_match_index]:
                        name = self.known_face_names[best_match_index]
                        confidence = face_confidence(face_distances[best_match_index])
                        if (float(confidence) < 90):
                            name = 'Unknown.0000000000.jpg'
                            confidence = 'Unknown'
                    else:
                        name = 'Unknown.0000000000.jpg'
                        confidence = 'Unknown'

                    name_part= name.split(".")[0]
                    id=name.split(".")[1].upper()


                    self.face_names.append(f'{name_part} ({confidence}) %')

            self.process_current_frame = not self.process_current_frame

            for (top, right, bottom, left), name in zip(self.face_locations, self.face_names):
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4

                cv2.rectangle(frame, (left, top), (right, bottom), (0, 0, 255), 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 0, 255), -1)
                cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

            imgBackground[162:162 + 480, 55:55 + 640] = frame
            cv2.imshow('face Recognition', imgBackground)
            cv2.setWindowProperty('face Recognition', cv2.WND_PROP_TOPMOST, 1)

            result = ''
  
            if str(user_id) == str(id):
                result = 'matched'
            else:
                result = 'not correct'

            # result = 'not correct'

            # Check if the user_id matches the recognized id
            # if str(user_id) == str(id):
            #     result = 'matched'
            #     match_count += 1  # Increment the match counter

            # self.last_matches.append(result)  # Store the result in the deque

            # # If the match count reaches 50 or more in the last 100 frames, break the loop
            # if match_count >= 10:
            #     break

            # # If there are 100 results in the deque and more than half of them are matches, break the loop
            # if len(self.last_matches) == 50 and sum(1 for r in self.last_matches if r == 'matched') >= 10:
            #     break

            if cv2.waitKey(1) == ord('q'):
                break

        video_capture.release()
        cv2.destroyAllWindows()

        print(user_id, id)

        return result


# fr = FaceRecognition()
# result = fr.run_recognition('SAR1234567')
# print(result)