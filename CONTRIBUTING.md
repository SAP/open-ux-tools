# Contributing to UX Tools
## 📖 Content

 * [Contributing Code](#how-to-contribute)

## 💻 Contributing Code
### General Remarks
You are welcome to contribute code to the UX Tools in order to fix bugs or to implement new features.

There are three important things to know:

1. You must be aware of the Apache License (which describes contributions) and **accept the Developer Certificate of Origin**. This is common practice in major Open Source projects. To make this process as simple as possible, we are using *[CLA assistant](https://cla-assistant.io/)* for individual contributions. CLA assistant is an open source tool that integrates with GitHub very well and enables a one-click experience for accepting the CLA. For company contributors, special rules apply. See the respective section below for details.
2. Follow our **[Development Conventions and Guidelines](/docs/Guidelines.md)**.
3. **Not all proposed contributions can be accepted**. Some features may just fit a third-party add-on better. The code must match the overall direction of the UX Tools and improve it. So there should be some "bang for the byte". For most bug fixes this is a given, but a major feature implementation first needs to be discussed with one of the committers. Possibly, one who touched the related code or module recently. The more effort you invest, the better you should clarify in advance whether the contribution will match the project's direction. The best way would be to just open an enhancement ticket in the issue tracker to discuss the feature you plan to implement (make it clear that you intend to contribute). We will then forward the proposal to the respective code owner. This avoids disappointment.

## Developer Certificate of Origin (DCO)

Due to legal reasons, contributors will be asked to accept a DCO before they submit the first pull request to this projects, this happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).

## How to Contribute
1. Make sure the change is welcome (see [General Remarks](#general-remarks)).
1. Create a branch by forking the relevant UX Tools repository and apply your change.
1. Commit and push your change on that branch.
    - **Please follow our [Development Conventions and Guidelines](/docs/Guidelines.md).**
1. Create a pull request in the UX Tools repository.
1. Follow the link posted by the CLA assistant to your pull request and accept it, as described above.
1. Wait for our code review and approval, possibly enhancing your change on request. Please do not mark conversations as resolved. The reviewer will take care of doing this.
1. Once the change has been approved and merged, we will inform you in a comment.
1. Celebrate!

## Contributing Reviews
Another very important option to contribute is by reviewing open pull requests. Good reviews are even more important than good code contributions. Reviews help to share knowledge as well as ownership.

## How to Review
1. Similar to contributing code, please be aware of our **[Development Conventions and Guidelines](/docs/Guidelines.md)**.
2. Be mindful about the words you use. We are all humans and we are all proud of the code we write. Keep that in mind when you recommend improvements or ask clarification questions.
3. Outline what and how you reviewed and what you did not do that you feel important to mention e.g. "I reviewed the unit tests and they cover the corrected functionality, however, I did not manually retry the reported faulty scenario"
4. It is ok to only review parts of a pull requests if you do not feel comfortable reviewing everying, however, you must clearly explain what you reviewed and more importantly what you did not review e.g. "I have reviewed module ABC but not modules DEFs"
5. Reviewing tests, test snapshots and configuration changes are as important as reviewing code.

Please note that common sense always wins over guidelines e.g. if a pull request just fixes a typo somewhere, it is ok to approve without an explanation of what you did and did not review.
