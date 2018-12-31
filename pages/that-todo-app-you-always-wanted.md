---
template: post
title: That ToDo App you Always Wanted
date: 2014-10-21
---

I decided the best way to learn Swift would be to whip together a simple Core Data app with a single view controller. That gives us a project with some depth but doesn't waste too much time on breadth by minimizing the time spent in IB and wiring up UI components. A ToDo app seemed like an obvious choice.

Our project requirements:

* Persist todos (Core Data)
* Have a completed state for todos, be able to delete them
* Have custom swipe controls for marking complete, deleting
* Edit todos in-place and touch to edit
* Color todos by position in list (urgency)

This project started with the navigation controller template in Xcode. I won't go over all of the changes or inclusions but you can get a [complete copy here](https://github.com/lattejed/Swift-ToDo) if you're interested. I also won't go through the building of the app step-by-step instead I'll just cover some of the more interesting parts with regards to transitioning to Swift.

![To-Do App](/static/img/Swift-ToDo_screencast.gif)

### Subclassing NSManagedObject

This seems even more straightforward in Swift than it did in Objective-C, mostly because the former is more terse. There's some debate about whether or not to use Xcode generated NSManagedObject subclasses, use a tool like mogenerator or write the classes by hand. After having worked on large projects with mogenerator I can say I'm not really a fan of the "two-class" approach. It adds a lot of bloat the project and doesn't really gain you that much. Swift makes subclassing by hand very easy. This is our `ToDo` model:

```swift
import CoreData

class ToDo: NSManagedObject {

    @NSManaged
    var createdAt: NSDate

    @NSManaged
    var summary: String?

    @NSManaged
    var order: Int32

    @NSManaged
    var completed: Bool

    class func entityName() -> NSString {
        return "ToDo"
    }

    class func insertNewObjectIntoContext(context : NSManagedObjectContext) -> ToDo {
        let todo = NSEntityDescription.insertNewObjectForEntityForName( self.entityName(), inManagedObjectContext:context ) as ToDo;
        todo.createdAt = NSDate();
        todo.order = todo.lastMaxPosition() + 1
        todo.completed = false
        return todo;
    }

    func lastMaxPosition () -> Int32 {
        let request = NSFetchRequest(entityName: self.entity.name!)
        request.fetchLimit = 1
        request.sortDescriptors = [NSSortDescriptor(key: "order", ascending: false)]

        var error: NSError? = nil
        let context : NSManagedObjectContext = self.managedObjectContext!
        let todos = context.executeFetchRequest(request, error: &error) as [ToDo]
        return todos.isEmpty ? 0 : todos[0].order
    }
}
```

This of course assumes we've set up a model with the same parameters and types. One possible stumbling blocks setting up the model is that entities in the model have to be given classes prefixed by the module. In other words the class setting in Xcode for Objective-C would have been `ToDo` whereas under swift it has to be `<xcdatamodeld name>.ToDo`, e.g., `Swift_ToDo.ToDo`.

You can see we've added the factory method `insertNewObjectIntoContext`. This is a convenience and also allows us to set up some default values. Some people prefer using NSManagedObjects `awakeFromInsert` for this but personally I've never seen the point. They both are called once in the object's lifetime and both give the same results. You can see we've also added the method `lastMaxPosition`. This allows us to fetch the last maximum order number when we create a new object. This has the effect of putting new objects at the top of the sort order. Why the explicit sort order?

### Moving UITableView Rows Using NSFetchedResultsController

This is not specific to Swift. When you're rearranging rows with NSFetchedResultsController you'll have to bandage a few methods as well as set an explicit sort order for the records. Setting an explicit sort order in a database is a large topic since setting a sort order on one record inevitably means setting the sort order on other, possibly all, records. If you have a large database then this could be an expensive operation. Since we're not likely to be dealing with large numbers of todo items in this app, we can take a fairly naive approach.

To set the sort order of a new record we use the method mentioned above and fetch the current first item in the list. To make this insert less expensive, we order the list backwards. When we add a new item the sort order becomes `last sort order + 1`. That's simple enough but when we're reordering rows things get a little more complicated. Again, since we're likely to be dealing with a small number of items, we'll simply reorder every record when we have to move a row.

```swift
// UITableViewDataSource

var isMovingItem : Bool = false

override func tableView(tableView: UITableView, canMoveRowAtIndexPath indexPath: NSIndexPath) -> Bool {
    return true
}

override func tableView(tableView: UITableView, moveRowAtIndexPath sourceIndexPath: NSIndexPath, toIndexPath destinationIndexPath: NSIndexPath) {
    isMovingItem = true

    if var todos = self.fetchedResultsController.fetchedObjects? {
        let todo = todos[sourceIndexPath.row] as ToDo
        todos.removeAtIndex(sourceIndexPath.row)
        todos.insert(todo, atIndex: destinationIndexPath.row)

        var idx : Int32 = Int32(todos.count)
        for todo in todos as [ToDo] {
            todo.order = idx--
        }
        saveContext()
    }

    dispatch_async(dispatch_get_main_queue(), { () -> Void in
        tableView.reloadRowsAtIndexPaths( tableView.indexPathsForVisibleRows()!, withRowAnimation: UITableViewRowAnimation.Fade )
    })

    isMovingItem = false
}

// NSFetchedResultsControllerDelegate

func controllerWillChangeContent(controller: NSFetchedResultsController) {
    if isMovingItem {
        return
    }
    self.tableView.beginUpdates()
}

func controller(controller: NSFetchedResultsController, didChangeSection sectionInfo: NSFetchedResultsSectionInfo, atIndex sectionIndex: Int, forChangeType type: NSFetchedResultsChangeType) {
    if isMovingItem {
        return
    }
    // Code removed
}

func controller(controller: NSFetchedResultsController, didChangeObject anObject: AnyObject, atIndexPath indexPath: NSIndexPath?, forChangeType type: NSFetchedResultsChangeType, newIndexPath: NSIndexPath?) {
    if isMovingItem {
        return
    }
    // Code removed
}

func controllerDidChangeContent(controller: NSFetchedResultsController) {
    if isMovingItem {
        return
    }
    self.tableView.endUpdates()
}
```

In the `moveRowAtIndexPath` method we copy the fetched results controller's objects to a mutable array and the set the sort order of each record starting from the number of records and working our way down to one.

You may be wondering what the `dispatch_async` call is doing in there. The internal state of the table view is in disarray until after that method returns. That means if we try to reload our rows before that method returns, we'll get unpredictable results (like reorder controls missing, reordered rows getting "stuck", etc). While using `dispatch_async` this way has always felt kind of like a hack, it is a simple way to move an operation to the back of the main queue, bypassing the issue.

To move the item, we have to keep a Bool property `isMovingItem` and set it while we're moving the record. We'll then check that in the controller's `controller*` methods and bail out if we are in the middle of a move as those methods will get called and throw exceptions when they're not supposed to. This highlights the problem with convenience classes like NSFetchedResultsController -- if you're going to make managing a table view a black box like this, you really have to go all of the way with it.

### Adding Closures to UIAlertView

Objective-C's blocks, combined with categories, allowed for streamlining a lot of UIKit classes by replacing delegation with block-based callbacks. The typical way to do this was to combine a category with a helper object that would act as a delegate. As categories could not contain instance variables, the solution was to use the Objecitve-C runtime's `objc_setAssociatedObject` and `objc_getAssociatedObject` to attach the helper object to the object. The helper object is then tied to the lifetime of the object and all is well.

So can we do this in Swift? [Yes, you can](http://www.russbishop.net/swift-storage-for-extension-properties). Instead of using categories we use a class extension. Since extensions cannot store data, we have to use the helper object and, surprisingly, the Objective-C runtime. It turns out it's straightforward to adapt the original method to Swift with only minor changes.

```swift
import Foundation
import UIKit

class AlertViewHelper {
    typealias ActionSheetFinished = (alertView: UIAlertView) -> ()
    var finished: ActionSheetFinished
    init(finished: ActionSheetFinished) {
        self.finished = finished
    }
}

private let _helperClassKey = malloc(4)

extension UIAlertView: UIAlertViewDelegate {

    private var helperObject: AlertViewHelper? {
        get {
            let r : AnyObject! = objc_getAssociatedObject(self, _helperClassKey)
            return r as? AlertViewHelper
        }
        set {
            objc_setAssociatedObject(self, _helperClassKey, newValue, UInt(OBJC_ASSOCIATION_RETAIN_NONATOMIC));
        }
    }

    convenience init(title: String, message: String, cancelButtonTitle: String?, firstButtonTitle: String, finished:(alertView: UIAlertView) -> ()) {
        self.init(title: title, message: message, delegate: nil, cancelButtonTitle: cancelButtonTitle, otherButtonTitles: firstButtonTitle)
        self.delegate = self
        self.helperObject = AlertViewHelper(finished: finished)
    }

    public func alertView(alertView: UIAlertView, clickedButtonAtIndex buttonIndex: Int) {
        if buttonIndex == 1 {
            self.helperObject?.finished(alertView: self)
        }
    }
}
```

In this case we're storing the callback closure in the helper object and the UIAlertView is acting as its own delegate. You could make the helper object the delegate as well if you're not happy about making an object its own delegate.

If you're wondering what the `malloc` call is for we're simply creating a pointer address which we'll use to get and set the helper object. I'm not 100% sure how I feel about this since it doesn't feel like idiomatic Swift. I've read that storage may be added to extensions in the future. If that's true, then we could skip calling the Objective-C runtime in this manner.

Once this is done we can use a UIAlertView to prompt users to delete todos. Instead of setting up a delegate method and extra properties to do this within the view controller, we can wrap everything up in a closure.

### Passing Swift Dictionaries to Objective-C Classes

This was something that's not very obvious at first and can lead to numerous hard to understand type errors. If you look at the type of the parameter in question, you'll see that it's `[NSObject : AnyObject]?`. This is the Swift type of an NSDictionary. If you define a dictionary with this type (seems obvious right?) you'll run into numerous type errors. The proper way to do it is to define you dictionary as `Dictionary<NSObject, AnyObject>`. When you pass it as a parameter, it will automatically be bridged to an NSDictionary. While this is obvious in retrospect, the documentation is vague.

### Handling iPhone 6 and 6+ Screen Sizes

Happily there's not much to worry about here (assuming you're supporting 7.x and 8.x only) apart from setting up the proper constraints in IB. This is admittedly a very simple app but I found the different screens sizes handled without issue.

### Misc Objective-C and Swift Observations

* Closure syntax seems to be actually worse than block syntax. Wow.
* Swift seems to have a much better type system than Objective-C, yet selectors are stringly typed?
* No header files. What a relief not having to type things twice.
* Swift is succinct and has a good type system. I'm confident it will live up to its hype of being a productive language.
* If you're missing `#pragma mark -` to divide up large classes, don't worry, you can use `// MARK:` to the same effect.
