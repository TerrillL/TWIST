var Schedule = require('../models/schedule');
var Participant = require('../models/participant');
var HighSchool = require('../models/highschool');
var Presenter = require('../models/presenter');
var Room = require('../models/room');
var Session = require('../models/session');
var Topic = require('../models/topic');

var async = require('async');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.index = function(req, res) {
    async.parallel({
      participant_count: function(callback) {
        Participant.countDocuments({}, callback);
      },
      presenter_count: function(callback) {
        Presenter.countDocuments({}, callback);
      },
      session_count: function(callback) {
        Session.countDocuments({}, callback);
      },
      topic_count: function(callback) {
        Topic.countDocuments({}, callback);
      },
      room_count: function(callback) {
        Room.countDocuments({}, callback);
      },
      highschool_count: function(callback) {
        HighSchool.countDocuments({}, callback);
      },
      schedule_count: function(callback) {
        Schedule.countDocuments({}, callback);
      },
    }, function(err, results) {
        res.render('index', { title: 'TWIST: Teen Women in Science and Technology', error: err, data: results });
    });
};

// Display list of all Schedules
exports.schedule_list = function(req,res, next) {
    Schedule.find({}, 'title schedule')
    .populate('session')
    .populate('topic')
    .populate('presenter')
    .populate('room')
    .exec(function (err, list_schedules) {
      if (err) { return next(err); }
      res.render('schedule_list', { title: 'Schedule List', schedule_list: list_schedules });
    });
};

// Display detail page of all Schedules
exports.schedule_detail = function(req,res,next) {

    async.parallel({
        schedule: function(callback) {
            Schedule.findById(req.params.id)
            .populate('session')
            .populate('topic')
            .populate('room')
            .populate('presenter')
            .exec(callback)
        },
        session: function(callback) {
            Schedule.find({ 'session': req.params.id })
            .exec(callback);
        },
        topic: function(callback) {
            Schedule.find({ 'topic': req.params.id })
            .exec(callback);
        },
        room: function(callback) {
            Schedule.find({ 'room': req.params.id })
            .exec(callback);
        },
        presenter: function(callback) {
            Schedule.find({ 'presenter': req.params.id })
            .exec(callback);
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.schedule==null) {
            var err = new Error('Schedule not found');
            err.status = 404;
            return next(err);
        }
        res.render('schedule_detail', { title: 'Schedule Detail', schedule: results.schedule, session: results.session, topic: results.topic, room: results.room, presenter: results.presenter });
    })
};

// Display Schedule create form on GET.
exports.schedule_create_get = function(req,res,next) { 
      
    // Get all sessions, rooms, topics, and presenters, which we can use for adding to our schedule.
    async.parallel({
        sessions: function(callback) {
            Session.find(callback);
        },
        rooms: function(callback) {
            Room.find(callback);
        },
        topics: function(callback) {
            Topic.find(callback);
        },
        presenters: function(callback) {
            Presenter.find(callback);
        },
    }, function(err, results) {
        if (err) { return next(err); }
        res.render('schedule_form', { title: 'Create Schedule', sessions: results.sessions, rooms: results.rooms, topics: results.topics, presenters: results.presenters });
    });
    
};

// Handle Schedule create on POST
exports.schedule_create_post = [
   
    // Validate fields.
    body('topic', 'Topic must not be empty.').isLength({ min: 1 }).trim(),
    body('presenter', 'Presenter must not be empty.').isLength({ min: 1 }).trim(),
    body('room', 'Room must not be empty.').isLength({ min: 1 }).trim(),
    body('session', 'Session must not be empty').isLength({ min: 1 }).trim(),
  
    // Sanitize fields (using wildcard).
    sanitizeBody('*').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
        
        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create an object with escaped and trimmed data.
        var schedule = new Schedule(
          { topic: req.body.topic,
            presenter: req.body.presenter,
            room: req.body.room,
            session: req.body.session
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all sessions, rooms, topics, and presenters for form.
            async.parallel({
                sessions: function(callback) {
                    Session.find(callback);
                },
                rooms: function(callback) {
                    Room.find(callback);
                },
                topics: function(callback) {
                    Topic.find(callback);
                },
                presenters: function(callback) {
                    Presenter.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }                
                res.render('schedule_form', { title: 'Create Schedule', sessions: results.sessions, rooms: results.rooms, topics: results.topics, presenters: results.presenters, schedule: schedule, errors: errors.array()  });
            });
            return;
        }
        else {
            // Data from form is valid. Save schedule.
            schedule.save(function (err) {
                if (err) { return next(err); }
                   //successful - redirect to new record.
                   res.redirect(schedule.url);
                });
        }
    }
];

// Display Schedule delete form on GET
exports.schedule_delete_get = function(req,res,next) {
    
    Schedule.findById(req.params.id)
    .populate('session')
    .populate('topic')
    .populate('room')
    .populate('presenter')
    .exec(function (err, schedule) {
        if (err) { return next(err); }
        if (schedule==null) { // No results.
            res.redirect('/index/schedules');
        }
        // Successful, so render.
        res.render('schedule_delete', { title: 'Delete Schedule', schedule: schedule});
    })
};

// Handle Schedule delete on POST
exports.schedule_delete_post = function(req,res,next) {
    
    // Assume valid Schedule id in field.
    schedule.findByIdAndRemove(req.body.id, function deleteschedule(err) {
        if (err) { return next(err); }
        // Success, so redirect to list of schedules.
        res.redirect('/index/schedules');
    });
};

//Display Schedule update form on GET
exports.schedule_update_get = function(req,res,next) {
    async.parallel({
        schedule:function(callback) {
            Schedule.findById(req.params.id).populate('session').populate('room').populate('topic').populate('presenter').exec(callback);
        },
        sessions: function(callback) {
            Session.find(callback);
        },
        rooms: function(callback) {
            Room.find(callback);
        },
        topics:function(callback) {
            Topic.find(callback)
        },
        presenters:function(callback) {
            Presenter.find(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.schedule==null) {
            var err = new Error('Schedule not found');
            err.status = 404;
            return next(err);
        }
        res.render('schedule_form', { title: 'Update Schedule', sessions: results.sessions, rooms: results.rooms, topics: results.topics, presenters: results.presenters, schedule: results.schedule})
    })
};

// Handle Schedule delete on POST
exports.schedule_update_post = [
    // Validate fields.
    body('topic', 'Topic must not be empty.').isLength({ min: 1 }).trim(),
    body('presenter', 'Presenter must not be empty.').isLength({ min: 1 }).trim(),
    body('room', 'Room must not be empty.').isLength({ min: 1 }).trim(),
    body('session', 'Session must not be empty').isLength({ min: 1 }).trim(),
  
    // Sanitize fields (using wildcard).
    sanitizeBody('*').trim().escape(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var schedule = new Schedule(
          { topic: req.body.topic,
            presenter: req.body.presenter,
            room: req.body.room,
            session: req.body.session,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all sessions, rooms, topics, and presenters for form.
            async.parallel({
                sessions: function(callback) {
                    Session.find(callback);
                },
                rooms: function(callback) {
                    Room.find(callback);
                },
                topics: function(callback) {
                    Topic.find(callback);
                },
                presenters: function(callback) {
                    Presenter.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }                
                res.render('schedule_form', { title: 'Create Schedule', sessions: results.sessions, rooms: results.rooms, topics: results.topics, presenters: results.presenters, schedule: schedule, errors: errors.array()  });
            });
            return;
        }
        else {
            // Data from form is valid. Save schedule.
            Schedule.findByIdAndUpdate(req.params.id, schedule, {}, function (err, theschedule) {
                if (err) { return next(err); }
                   //successful - redirect to new record.
                   res.redirect(schedule.url);
                });
        }
    }
];