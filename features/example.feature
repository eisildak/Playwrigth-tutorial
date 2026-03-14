Feature: Homepage check
  As a user
  I want to verify the NNY homepage
  So that I know BDD tests run correctly

  Scenario: Open NNY homepage and validate title
    Given I open the "homepage"
    Then page title should contain "NNY"
    And I open the MYU homepage
    Then page title should contain "NNY - Nuh Naci Yazgan Üniversitesi"
    And I wait for 2 seconds
    When I scroll to the bottom of the page
    Then I click on the "iletişim link"
    And I should see the "contact information"
    When I fill the contact form with valid data
    And I submit the contact form
    Then I should see the "success message"
