# actions.py
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionStoreIncident(Action):
    def name(self) -> Text:
        return "action_store_incident"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        # Just acknowledge for now
        dispatcher.utter_message(text="Thank you. Your report has been recorded.")
        return []
